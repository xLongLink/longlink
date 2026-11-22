// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { withMounted } from '../../render';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { act, createElement, StrictMode, useState } from 'react';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

it('ignores late successes and failures from canceled verification attempts', async () => {
    // Arrange
    const attempts: { request: VerificationRequest; resolve: (value: string) => void }[] = [];

    /** Settle canceled work even when its underlying operation ignores cancellation. */
    function verify(request: VerificationRequest): Promise<string> {
        const replay = attempts.length === 0;

        return new Promise((resolve, reject) => {
            attempts.push({ request, resolve });
            request.signal.addEventListener(
                'abort',
                () => {
                    if (replay) resolve('stale');
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
