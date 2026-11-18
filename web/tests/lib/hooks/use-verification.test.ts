import { it, expect } from 'vitest';
// @vitest-environment happy-dom
import { withMounted } from '../../render';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { act, createElement, StrictMode, useState } from 'react';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

it('publishes successful verification and cleans up its signal on unmount', async () => {
    // Arrange
    const attempts: VerificationRequest[] = [];

    async function verify(request: VerificationRequest) {
        attempts.push(request);

        return 'verified';
    }

    function Probe() {
        return useVerification('proof', verify).verification;
    }

    // Act
    await withMounted(createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe)), async (output) => {
        // Assert
        expect(output.textContent).toBe('verified');
        expect(attempts[0]?.signal.aborted).toBe(false);
    });
    expect(attempts[0]?.token).toBe('proof');
    expect(attempts[0]?.signal.aborted).toBe(true);
});

it.each(['resolve', 'reject'])('ignores canceled exchanges that %s after replay or replacement', async (settlement) => {
    // Arrange
    const attempts: { request: VerificationRequest; resolve: (value: string) => void }[] = [];

    /** Settle canceled work even when its underlying operation ignores cancellation. */
    function verify(request: VerificationRequest): Promise<string> {
        return new Promise((resolve, reject) => {
            attempts.push({ request, resolve });
            request.signal.addEventListener(
                'abort',
                () => {
                    if (settlement === 'resolve') resolve('stale');
                    else reject(new Error('Canceled exchange failed'));
                },
                { once: true }
            );
        });
    }

    /** Exercise both user retries and token-driven replacement. */
    function Probe() {
        const [token, setToken] = useState('proof');
        const { verification, startVerification } = useVerification(token, verify);

        return createElement(
            'div',
            null,
            createElement('output', null, verification ?? 'Pending'),
            createElement('button', { onClick: () => void startVerification(token) }, 'Retry'),
            createElement('button', { onClick: () => setToken('replacement') }, 'Change token')
        );
    }

    // Act
    await withMounted(createElement('section'), async (output) => {
        const container = output.querySelector('section');
        if (!container) throw new Error('Missing mount container');
        const root = createRoot(container);

        try {
            await act(async () =>
                root.render(
                    createElement(
                        StrictMode,
                        null,
                        createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe))
                    )
                )
            );

            // Assert
            expect(attempts[0]?.request.signal.aborted).toBe(true);
            expect(output.querySelector('output')?.textContent).toBe('Pending');

            await act(async () => output.querySelectorAll('button')[0]?.click());
            expect(attempts[1]?.request.signal.aborted).toBe(true);
            expect(output.querySelector('output')?.textContent).toBe('Pending');

            await act(async () => output.querySelectorAll('button')[1]?.click());
            expect(attempts[2]?.request.signal.aborted).toBe(true);
            expect(attempts[3]?.request.token).toBe('replacement');
            expect(output.querySelector('output')?.textContent).toBe('Pending');

            await act(async () => attempts[3]?.resolve('verified'));
            expect(output.querySelector('output')?.textContent).toBe('verified');
        } finally {
            await act(async () => root.unmount());
        }
    });
});

it.each(['resolve', 'reject'])('cancels an exchange that will %s when its owning page unmounts', async (settlement) => {
    // Arrange
    const attempts: VerificationRequest[] = [];

    /** Keep the exchange pending until its signal is aborted. */
    function verify(request: VerificationRequest): Promise<string> {
        attempts.push(request);

        return new Promise((resolve, reject) => {
            request.signal.addEventListener(
                'abort',
                () => {
                    if (settlement === 'resolve') resolve('verified');
                    else reject(new Error('Canceled exchange failed'));
                },
                { once: true }
            );
        });
    }

    /** Show whether verification completed before the page unmounts. */
    function Probe() {
        return useVerification('proof', verify).verification ?? 'Pending';
    }

    // Act
    await withMounted(createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe)), async (output) => {
        // Assert
        expect(output.textContent).toBe('Pending');
        expect(attempts).toHaveLength(1);
        expect(attempts[0]?.token).toBe('proof');
        expect(attempts[0]?.signal.aborted).toBe(false);
    });
    expect(attempts[0]?.signal.aborted).toBe(true);
});
