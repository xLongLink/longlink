// @vitest-environment happy-dom
import { ApiError } from '@/lib/api';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../render';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { MemoryRouter, useNavigate } from 'react-router';
import { act, createElement, StrictMode, useLayoutEffect } from 'react';
import { useVerification, type VerificationRequest } from '@/lib/hooks/use-verification';

it('ignores late successes and failures from canceled verification attempts', async () => {
    // Arrange
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
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
        const navigate = useNavigate();
        const { verification, startVerification } = useVerification('verification.token', verify);

        return createElement(
            'div',
            null,
            createElement('output', null, verification?.status === 'verified' ? verification.data : 'Pending'),
            createElement('button', { onClick: () => void startVerification('proof') }, 'Retry'),
            createElement('button', { onClick: () => void navigate('/verify#token=replacement') }, 'Change token')
        );
    }

    sessionStorage.setItem('verification.token', 'proof');
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
                        createElement(
                            MemoryRouter,
                            null,
                            createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe))
                        )
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
            window.history.replaceState(originalState, '', originalUrl);
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
        const { verification } = useVerification('verification.token', async () => 'accepted');
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

it('captures fragment proof and preserves history state before layout observers run', async () => {
    // Arrange
    const originalUrl = window.location.href;
    const originalState: unknown = window.history.state;
    const state = { idx: 3, key: 'entry', usr: { returnTo: '/account' } };
    const verify = vi.fn(async (_request: VerificationRequest) => 'accepted');
    const observed: { hash: string; search: string; proof: string | null; state: unknown }[] = [];
    window.history.replaceState(state, '', '/verify?keep=1#token=url-proof');
    sessionStorage.setItem('verification.token', 'older-proof');

    /** Observes credential capture during the same prepaint commit. */
    function Probe() {
        useVerification('verification.token', verify);
        useLayoutEffect(() => {
            observed.push({
                hash: window.location.hash,
                search: window.location.search,
                proof: sessionStorage.getItem('verification.token'),
                state: window.history.state
            });
        }, []);
        return null;
    }

    try {
        // Act
        await withMounted(
            createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe)),
            async () => {
                // Assert
                expect(observed).toEqual([{ hash: '', search: '?keep=1', proof: 'url-proof', state }]);
                expect(verify.mock.calls[0]?.[0].token).toBe('url-proof');
                expect(sessionStorage.getItem('verification.token')).toBeNull();
            },
            '/verify?keep=1#token=url-proof'
        );
    } finally {
        window.history.replaceState(originalState, '', originalUrl);
        sessionStorage.removeItem('verification.token');
    }
});

it.each(['accepted', 'rejected'])(
    'consumes stored proof only after it is %s without starting setup recovery',
    async (outcome) => {
        // Arrange
        sessionStorage.setItem('verification.token', 'stored-proof');
        let resolve: (value: string) => void = () => undefined;
        let reject: (reason: Error) => void = () => undefined;
        const response = new Promise<string>((accept, fail) => {
            resolve = accept;
            reject = fail;
        });
        const verify = vi.fn(async (_request: VerificationRequest) => await response);

        /** Uses stored proof without choosing a recovery request implicitly. */
        function Probe() {
            const { verification } = useVerification('verification.token', verify);
            return createElement('output', null, verification?.status ?? 'Pending');
        }

        try {
            // Act
            await withMounted(
                createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe)),
                async (output) => {
                    // Assert
                    expect(verify.mock.calls[0]?.[0].token).toBe('stored-proof');
                    expect(sessionStorage.getItem('verification.token')).toBe('stored-proof');
                    expect(output.textContent).toBe('Pending');

                    // Act
                    await act(async () => {
                        if (outcome === 'accepted') resolve('accepted');
                        else reject(new ApiError('Invalid proof', 400));
                    });

                    // Assert
                    expect(output.textContent).toBe(outcome === 'accepted' ? 'verified' : 'error');
                    expect(sessionStorage.getItem('verification.token')).toBeNull();
                    expect(verify).toHaveBeenCalledTimes(1);
                }
            );
        } finally {
            sessionStorage.removeItem('verification.token');
        }
    }
);

it.each(['getItem', 'setItem'] as const)(
    'surfaces token storage %s failures without admitting credentials',
    async (method) => {
        // Arrange
        const verify = vi.fn(async (_request: VerificationRequest) => 'accepted');
        const storage = vi.spyOn(sessionStorage, method).mockImplementation(() => {
            throw new DOMException('Storage unavailable', 'SecurityError');
        });

        /** Leaves storage errors to the owning error boundary. */
        function Probe() {
            useVerification('verification.token', verify);
            return null;
        }

        try {
            // Act
            await withMounted(
                createElement(ErrorBoundary, { fallback: 'Failure' }, createElement(Probe)),
                async (output) => {
                    // Assert
                    expect(output.textContent).toBe('Failure');
                    if (method === 'getItem') expect(verify).not.toHaveBeenCalled();
                    else expect(verify.mock.calls[0]?.[0].signal.aborted).toBe(true);
                },
                method === 'setItem' ? '/verify#token=proof' : '/verify'
            );
        } finally {
            storage.mockRestore();
        }
    }
);
