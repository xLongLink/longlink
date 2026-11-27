// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { act, createElement, StrictMode, useState } from 'react';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

it('ignores late successes and failures from canceled verification attempts', async () => {
    // Arrange
    const attempts: {
        request: VerificationRequest;
        resolve: (value: string) => void;
        reject: (reason: Error) => void;
    }[] = [];

    /** Settle canceled work even when its underlying operation ignores cancellation. */
    function verify(request: VerificationRequest): Promise<string> {
        return new Promise((resolve, reject) => {
            attempts.push({ request, resolve, reject });
        });
    }

    /** Exercise both user retries and token-driven replacement. */
    function Probe() {
        const [token, setToken] = useState('proof');
        const { verification, startVerification } = useVerification(token, 'verification.token', verify);

        return createElement(
            'div',
            null,
            createElement('output', null, verification?.status === 'verified' ? verification.data : 'Pending'),
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

            sessionStorage.setItem('verification.token', 'replacement');
            await act(async () => attempts[3]?.resolve('verified'));
            expect(output.querySelector('output')?.textContent).toBe('verified');
            expect(sessionStorage.getItem('verification.token')).toBeNull();

            sessionStorage.setItem('verification.token', 'next-proof');
            await act(async () => attempts[0]?.resolve('stale'));
            expect(output.querySelector('output')?.textContent).toBe('verified');
            expect(output.textContent).not.toContain('Failure');
            expect(sessionStorage.getItem('verification.token')).toBe('next-proof');

            await act(async () => attempts[1]?.reject(new Error('Canceled exchange failed')));
            expect(output.querySelector('output')?.textContent).toBe('verified');
            expect(output.textContent).not.toContain('Failure');

            await act(async () => attempts[2]?.resolve('stale retry'));
            expect(output.querySelector('output')?.textContent).toBe('verified');
            expect(output.textContent).not.toContain('Failure');
            expect(sessionStorage.getItem('verification.token')).toBe('next-proof');
        } finally {
            await act(async () => root.unmount());
            sessionStorage.removeItem('verification.token');
        }
    });
});

it('surfaces credential consumption failures instead of classifying them as invalid credentials', async () => {
    // Arrange
    sessionStorage.setItem('verification.token', 'proof');
    const consumption = vi.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
        throw new DOMException('Storage unavailable', 'SecurityError');
    });

    /** Completes the exchange before storage consumption fails. */
    function Probe() {
        const { verification } = useVerification('proof', 'verification.token', async () => 'accepted');
        return createElement('output', null, verification?.status ?? 'Pending');
    }

    try {
        // Act
        await withMounted(
            createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe)),
            async (output) => {
                // Assert
                expect(output.textContent).toBe('Failure');
                expect(sessionStorage.getItem('verification.token')).toBe('proof');
            }
        );
    } finally {
        consumption.mockRestore();
        sessionStorage.removeItem('verification.token');
    }
});
