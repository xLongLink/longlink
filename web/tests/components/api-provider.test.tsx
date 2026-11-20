// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { z } from 'zod';
import { flushSync } from 'react-dom';
import { withMounted } from '../render';
import { Toaster, toast } from 'sonner';
import { it, vi, expect } from 'vitest';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { createRoot } from 'react-dom/client';
import { ApiProvider } from '@/components/api';
import { apiQueryOptions } from '@/lib/react-query';
import userEvent from '@testing-library/user-event';
import { Dialog } from '@/components/longlink/layout/dialog';
import { act, StrictMode, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const orderSchema = z.object({ name: z.string() });

it('keeps pending feedback and its dismissal when document appearance and direction change', async () => {
    const html = document.documentElement;
    const initialTheme = html.getAttribute('data-theme');
    const initialDirection = html.getAttribute('dir');

    function Failure() {
        const reportError = useApiError();

        useEffect(() => {
            reportError(new ApiError('Update rejected', 403));
        }, [reportError]);

        return null;
    }

    try {
        html.dataset.theme = 'light';
        html.dir = 'ltr';

        await withMounted(
            <ApiProvider platformSession>
                <Failure />
            </ApiProvider>,
            async () => {
                await vi.waitFor(() =>
                    expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain('Update rejected')
                );
                const notification = document.querySelector('[data-sonner-toast]');

                for (const theme of ['dark', 'light', 'system']) {
                    await act(async () => {
                        html.dataset.theme = theme;
                        html.dir = theme === 'dark' ? 'rtl' : 'ltr';
                    });
                    await vi.waitFor(() => {
                        expect(document.querySelector('[data-sonner-toast]')).toBe(notification);
                    });
                }

                await act(async () =>
                    notification?.querySelector<HTMLButtonElement>('[aria-label="Close toast"]')?.click()
                );
                await vi.waitFor(() => expect(document.querySelector('[data-sonner-toast]')).toBeNull());
            }
        );
    } finally {
        if (initialTheme === null) html.removeAttribute('data-theme');
        else html.setAttribute('data-theme', initialTheme);

        if (initialDirection === null) html.removeAttribute('dir');
        else html.setAttribute('dir', initialDirection);
    }
});

it('keeps initial direct-error feedback through the document StrictMode effect replay', async () => {
    const failure = new ApiError('Initial write rejected', 403);
    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output);

    /** Reports a workflow failure discovered by an initial mounted effect. */
    function InitialFailure() {
        const reportError = useApiError();

        useEffect(() => {
            reportError(failure);
        }, [reportError]);

        return null;
    }

    try {
        flushSync(() =>
            root.render(
                <StrictMode>
                    <ApiProvider platformSession>
                        <InitialFailure />
                    </ApiProvider>
                </StrictMode>
            )
        );
        await vi.waitFor(() => {
            expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
            expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain('Initial write rejected');
        });
    } finally {
        root.unmount();
        output.remove();
    }

    await vi.waitFor(() => expect(toast.getToasts()).toHaveLength(0));
});

it('keeps API failures in Sonner’s live region while a real dialog opens and closes', async () => {
    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(Response.json({ detail: 'Membership change rejected' }, { status: 403 }));

    /** Opens the same modal primitives used by the account and settings workflows. */
    function MembershipDialog() {
        const reportError = useApiError();
        const [open, setOpen] = useState(false);

        const content = (
            <>
                <button type="button" onClick={() => void api.post('/api/v1/membership').catch(reportError)}>
                    Change membership
                </button>
                <button type="button" onClick={() => setOpen(false)}>
                    Keep membership
                </button>
            </>
        );

        return (
            <>
                <button type="button" onClick={() => setOpen(true)}>
                    Open membership
                </button>
                <Dialog title="Membership" open={open} onOpenChange={setOpen}>
                    {content}
                </Dialog>
            </>
        );
    }

    try {
        await withMounted(
            <ApiProvider platformSession>
                <MembershipDialog />
            </ApiProvider>,
            async (output) => {
                const events = userEvent.setup();
                const opener = output.querySelector('button');

                if (!opener) throw new Error('Missing modal opener');
                await act(async () => events.click(opener));

                const modal = document.querySelector('[role="dialog"]');

                if (!modal) throw new Error('Missing active membership dialog');

                const change = Array.from(modal.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Change membership'
                );

                if (!change) throw new Error('Missing membership action');
                await act(async () => events.click(change));
                await vi.waitFor(() =>
                    expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain(
                        'Membership change rejected'
                    )
                );

                const notification = document.querySelector('[data-sonner-toast]');
                expect(notification?.closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite');
                expect(notification?.closest('[aria-hidden="true"], [inert]')).toBeNull();

                const keep = Array.from(modal.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Keep membership'
                );

                if (!keep) throw new Error('Missing modal close action');
                await act(async () => events.click(keep));
                await vi.waitFor(() => {
                    expect(document.querySelector('[role="dialog"][data-open]')).toBeNull();
                    expect(document.querySelector('[data-sonner-toast]')).toBe(notification);
                });
                await act(async () => events.click(opener));
                await vi.waitFor(() => {
                    const activeModal = document.querySelector('[role="dialog"]');

                    expect(activeModal).not.toBeNull();
                    expect(document.querySelector('[data-sonner-toast]')).toBe(notification);
                    expect(notification?.closest('[aria-hidden="true"], [inert]')).toBeNull();
                });

                await act(async () => events.keyboard('{Escape}'));
                await vi.waitFor(() => {
                    expect(document.querySelector('[role="dialog"][data-open]')).toBeNull();
                    expect(document.activeElement).toBe(opener);
                });

                const dismiss = document.querySelector<HTMLButtonElement>('[aria-label="Close toast"]');

                if (!dismiss) throw new Error('Missing notification dismissal');
                await act(async () => dismiss.focus());
                expect(document.activeElement).toBe(dismiss);
                await act(async () => events.keyboard('{Enter}'));
                await vi.waitFor(() => expect(document.querySelector('[data-sonner-toast]')).toBeNull());
                expect(transport).toHaveBeenCalledTimes(1);
            }
        );
    } finally {
        transport.mockRestore();
    }
});

it('reports one failed GET shared by observers, supports dismissal, and recovers through refetch', async () => {
    // Arrange
    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Unexpected request'))
        .mockResolvedValueOnce(Response.json({ detail: 'Orders unavailable' }, { status: 503 }))
        .mockResolvedValueOnce(Response.json({ name: 'Recovered orders' }));

    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output);

    /** Reads the same resource from independent observers. */
    function Orders() {
        const orders = useQuery(apiQueryOptions('/api/v1/orders', orderSchema));

        return (
            <>
                <p>{orders.data?.name ?? (orders.error ? 'Read failed' : 'Loading')}</p>
                <button type="button" onClick={() => void orders.refetch()}>
                    Reload orders
                </button>
            </>
        );
    }

    try {
        // Act
        flushSync(() =>
            root.render(
                <ApiProvider platformSession>
                    <Orders />
                    <Orders />
                </ApiProvider>
            )
        );

        // Assert
        await vi.waitFor(() => {
            expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
            expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain('Orders unavailable');
            expect(Array.from(output.querySelectorAll('p'), (element) => element.textContent)).toEqual([
                'Read failed',
                'Read failed'
            ]);
        });
        expect(transport).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[data-sonner-toast][data-type="error"] [data-icon] svg')).not.toBeNull();
        expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain('Orders unavailable');

        // Act
        document.querySelector<HTMLButtonElement>('[aria-label="Close toast"]')?.click();

        // Assert
        await vi.waitFor(() => expect(document.querySelector('[data-sonner-toast]')).toBeNull());

        // Act
        output.querySelector<HTMLButtonElement>('button')?.click();

        // Assert
        await vi.waitFor(() => {
            expect(Array.from(output.querySelectorAll('p'), (element) => element.textContent)).toEqual([
                'Recovered orders',
                'Recovered orders'
            ]);
        });
        expect(transport).toHaveBeenCalledTimes(2);
        expect(document.querySelector('[data-sonner-toast]')).toBeNull();
    } finally {
        root.unmount();
        output.remove();
        transport.mockRestore();
    }
});

it('reports direct API failures without a legacy toast provider and clears prior-account notifications', async () => {
    // Arrange
    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(Response.json({ detail: 'Change rejected' }, { status: 403 }));

    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output);

    /** Exercises the reporter used by imperative API workflows. */
    function ChangeOrder() {
        const reportError = useApiError();
        const client = useQueryClient();

        return (
            <>
                <button
                    type="button"
                    onClick={() => {
                        client.setQueryData(['api', '/api/v1/me'], { id: 'account-a' });
                        void api.post('/api/v1/orders').catch(reportError);
                    }}
                >
                    Change order
                </button>
                <button type="button" onClick={() => client.setQueryData(['api', '/api/v1/me'], { id: 'account-b' })}>
                    Switch account
                </button>
            </>
        );
    }

    try {
        // Act
        flushSync(() =>
            root.render(
                <ApiProvider platformSession>
                    <ChangeOrder />
                </ApiProvider>
            )
        );
        output.querySelector<HTMLButtonElement>('button')?.click();

        // Assert
        await vi.waitFor(() =>
            expect(document.querySelector('[data-sonner-toast]')?.textContent).toContain('Change rejected')
        );
        expect(transport).toHaveBeenCalledTimes(1);

        // Act
        output.querySelectorAll('button')[1]?.click();

        // Assert
        await vi.waitFor(() => expect(document.querySelector('[data-sonner-toast]')).toBeNull());
    } finally {
        root.unmount();
        output.remove();
        transport.mockRestore();
    }
});

it('dismisses only its own notifications and prevents late direct failures from reaching the next provider', async () => {
    // Arrange
    let finishRequest: ((response: Response) => void) | undefined;

    const response = new Promise<Response>((resolve) => {
        finishRequest = resolve;
    });

    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(Response.json({ detail: 'Old account failure' }, { status: 403 }))
        .mockReturnValueOnce(response);

    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output);
    let request: Promise<Response | void> | undefined;
    let unrelatedId: string | number | undefined;

    /** Starts a direct request which can outlive its provider. */
    function DirectRequest() {
        const reportError = useApiError();

        return (
            <button
                type="button"
                onClick={() => {
                    request = api.post('/api/v1/orders').catch(reportError);
                }}
            >
                Change order
            </button>
        );
    }

    try {
        // Act
        flushSync(() =>
            root.render(
                <>
                    <Toaster id="other-owner" />
                    <ApiProvider platformSession>
                        <DirectRequest />
                    </ApiProvider>
                </>
            )
        );
        unrelatedId = toast('Unrelated notice', { toasterId: 'other-owner', duration: Infinity });
        output.querySelector<HTMLButtonElement>('button')?.click();

        // Assert
        await vi.waitFor(() => {
            expect(document.body.textContent).toContain('Unrelated notice');
            expect(document.body.textContent).toContain('Old account failure');
        });

        // Act
        output.querySelector<HTMLButtonElement>('button')?.click();
        await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
        flushSync(() => root.render(<Toaster id="other-owner" />));
        flushSync(() =>
            root.render(
                <>
                    <Toaster id="other-owner" />
                    <ApiProvider platformSession>
                        <p>Next account</p>
                    </ApiProvider>
                </>
            )
        );
        finishRequest?.(Response.json({ detail: 'Late old-account failure' }, { status: 403 }));
        await request;

        // Assert
        await vi.waitFor(() => {
            expect(document.body.textContent).toContain('Unrelated notice');
            expect(document.body.textContent).toContain('Next account');
            expect(document.body.textContent).not.toContain('Old account failure');
            expect(document.body.textContent).not.toContain('Late old-account failure');
            expect(toast.getToasts().map((notification) => notification.id)).toEqual([unrelatedId]);
        });
    } finally {
        root.unmount();

        if (unrelatedId !== undefined) toast.dismiss(unrelatedId);
        finishRequest?.(Response.json({}));
        await request;
        output.remove();
        transport.mockRestore();
    }
});
