// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { user } from '../../render';
import { it, expect, vi } from 'vitest';
import { Route, Routes } from 'react-router';
import { withMounted } from '../../../render';
import { ApiBoundary } from '@/components/api';
import { ApiErrorContext } from '@/lib/errors';
import UserLayout from '@/platform/layouts/user';
import { useQuery } from '@tanstack/react-query';
import Page from '@/platform/routes/user/settings';
import userEvent from '@testing-library/user-event';
import { AccountProvider } from '@/platform/account';
import Authenticated from '@/platform/layouts/authenticated';
import { CurrentUserContext } from '@/platform/hooks/use-user';

/** Publishes authoritative profile responses through the account observer. */
function AccountSettings() {
    const currentUser = useQuery({ queryKey: ['api', '/api/v1/me'], initialData: user, enabled: false });

    return (
        <CurrentUserContext value={currentUser}>
            <Page />
            <output aria-label="Authenticated account name">{currentUser.data.name}</output>
        </CurrentUserContext>
    );
}

it('trims blur saves, locks the pending field, and publishes the canonical account name', async () => {
    // Arrange
    const errors: unknown[] = [];
    const requests: Request[] = [];
    let resolveSave: (response: Response) => void = () => undefined;

    const saveResponse = new Promise<Response>((resolve) => {
        resolveSave = resolve;
    });

    const canonicalUser = { ...user, name: 'Canonical Owner' };

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);
        requests.push(request);

        if (request.method === 'PATCH' && new URL(request.url).pathname === '/api/v1/me') return saveResponse;

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <AccountSettings />
            </ApiErrorContext>,
            async (output) => {
                const events = userEvent.setup();
                const input = output.querySelector('input');

                if (!input) throw new Error('Username input is missing');
                expect(input.value).toBe('Owner');
                expect(output.textContent).toContain('owner@example.com');

                // Act
                await act(async () => {
                    await events.clear(input);
                    await events.type(input, '  Updated Owner  ');
                });

                // Assert
                expect(requests).toEqual([]);

                // Act
                await act(async () => events.tab());

                // Assert
                await vi.waitFor(() => expect(input.readOnly).toBe(true));
                expect(requests.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
                    'PATCH /api/v1/me'
                ]);
                expect(await requests[0]?.clone().json()).toEqual({ name: 'Updated Owner' });
                expect(output.querySelector('output')?.textContent).toBe('Owner');

                await act(async () => {
                    await events.click(input);
                    await events.tab();
                });
                expect(requests).toHaveLength(1);

                // Act
                await act(async () => resolveSave(Response.json(canonicalUser)));

                // Assert
                await vi.waitFor(() => {
                    expect(input.readOnly).toBe(false);
                    expect(input.value).toBe('Canonical Owner');
                    expect(output.querySelector('output')?.textContent).toBe('Canonical Owner');
                });
                expect(output.querySelector('h1')?.textContent).toBe('Canonical Owner');

                // Act
                await act(async () => {
                    await events.click(input);
                    await events.tab();
                });

                // Assert
                expect(requests).toHaveLength(1);
                expect(errors).toEqual([]);
            },
            '/user/settings'
        );
    } finally {
        resolveSave(Response.json(user));
        transport.mockRestore();
    }
});

it('saves theme by keyboard without discarding the name draft, then resets the draft for a new account', async () => {
    let account = user;
    const writes: unknown[] = [];
    const submitted = vi.fn();
    const appearanceKey = 'longlink:appearance';
    const cached = localStorage.getItem(appearanceKey);
    const savedAccount = { ...user, theme: 'light' } satisfies typeof user;
    let resolveSave: (response: Response) => void = () => undefined;
    const save = new Promise<Response>((resolve) => {
        resolveSave = resolve;
    });
    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (new URL(request.url).pathname !== '/api/v1/me') throw new Error(`Unexpected request: ${request.url}`);
        if (request.method === 'GET') return Response.json(account);
        if (request.method !== 'PATCH') throw new Error(`Unexpected method: ${request.method}`);
        writes.push(await request.json());

        return (await save).clone();
    });

    try {
        await withMounted(
            <ApiErrorContext
                value={(error) => {
                    throw error;
                }}
            >
                <AccountProvider>
                    <ApiBoundary>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                submitted();
                            }}
                        >
                            <Routes>
                                <Route element={<Authenticated />}>
                                    <Route element={<UserLayout />}>
                                        <Route path="/user/settings" element={<Page />} />
                                    </Route>
                                </Route>
                            </Routes>
                        </form>
                    </ApiBoundary>
                </AccountProvider>
            </ApiErrorContext>,
            async (output) => {
                const events = userEvent.setup();
                await vi.waitFor(() => expect(output.querySelector('#account-name')).not.toBeNull());
                const name = output.querySelector<HTMLInputElement>('#account-name');
                const dark = output.querySelector<HTMLInputElement>('input[aria-label="Dark"]');
                const light = output.querySelector<HTMLInputElement>('input[aria-label="Light"]');

                if (!name || !dark || !light) throw new Error('Expected username and theme settings');
                await act(async () => {
                    dark.focus();
                    await events.keyboard('{Enter}');
                });
                await vi.waitFor(() => {
                    expect(dark.getAttribute('aria-disabled')).toBe('true');
                    expect(document.documentElement.dataset.theme).toBe('dark');
                });
                expect(writes).toEqual([{ theme: 'dark' }]);

                await act(async () => {
                    await events.keyboard('{Enter} ');
                    light.click();
                    await events.clear(name);
                    await events.type(name, 'Unsaved Owner');
                });
                expect(writes).toHaveLength(1);
                expect(submitted).not.toHaveBeenCalled();

                await act(async () => resolveSave(Response.json(savedAccount)));
                await vi.waitFor(() => {
                    expect(dark.getAttribute('aria-disabled')).toBeNull();
                    expect(light.checked).toBe(true);
                    expect(localStorage.getItem(appearanceKey)).toBe(JSON.stringify({ theme: 'light' }));
                });
                expect(document.documentElement.dataset.theme).toBe('light');
                expect(output.querySelector('#account-name')).toBe(name);
                expect(name.value).toBe('Unsaved Owner');

                await act(async () => {
                    account = {
                        ...savedAccount,
                        id: '00000000-0000-4000-8000-000000000003',
                        name: 'Another Owner',
                        email: 'another@example.com'
                    };
                    localStorage.setItem(appearanceKey, JSON.stringify({ theme: 'dark' }));
                    window.dispatchEvent(new StorageEvent('storage', { key: appearanceKey }));
                });
                await vi.waitFor(() => {
                    expect(output.querySelector<HTMLInputElement>('#account-name')?.value).toBe('Another Owner');
                    expect(output.textContent).toContain('another@example.com');
                    expect(localStorage.getItem(appearanceKey)).toBe(JSON.stringify({ theme: 'light' }));
                });
                expect(writes).toHaveLength(1);
            },
            '/user/settings'
        );
    } finally {
        resolveSave(Response.json(savedAccount));
        transport.mockRestore();
        if (cached === null) localStorage.removeItem(appearanceKey);
        else localStorage.setItem(appearanceKey, cached);
    }
});

it('keeps a failed name draft and saves it successfully on retry', async () => {
    // Arrange
    const errors: unknown[] = [];
    const requests: Request[] = [];
    let resolveSave: (response: Response) => void = () => undefined;

    const saveResponse = new Promise<Response>((resolve) => {
        resolveSave = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (request.method === 'PATCH' && new URL(request.url).pathname === '/api/v1/me') {
            requests.push(request);

            return requests.length === 1 ? saveResponse : Response.json({ ...user, name: 'Rejected Owner' });
        }

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <AccountSettings />
            </ApiErrorContext>,
            async (output) => {
                const events = userEvent.setup();
                const input = output.querySelector('input');

                if (!input) throw new Error('Username input is missing');
                expect(input.value).toBe('Owner');

                // Act
                await act(async () => {
                    await events.clear(input);
                    await events.type(input, 'Rejected Owner');
                    await events.tab();
                });

                // Assert
                await vi.waitFor(() => expect(input.readOnly).toBe(true));

                // Act
                await act(async () =>
                    resolveSave(Response.json({ detail: 'Profile could not be saved' }, { status: 500 }))
                );

                // Assert
                await vi.waitFor(() => {
                    expect(input.readOnly).toBe(false);
                    expect(input.value).toBe('Rejected Owner');
                    expect(errors).toHaveLength(1);
                });
                expect(output.querySelector('h1')?.textContent).toBe('Rejected Owner');
                expect(output.querySelector('output')?.textContent).toBe('Owner');
                expect(errors[0]).toMatchObject({ message: 'Profile could not be saved', status: 500 });

                // Act
                await act(async () => {
                    await events.click(input);
                    await events.tab();
                });

                // Assert
                await vi.waitFor(() => {
                    expect(requests).toHaveLength(2);
                    expect(input.readOnly).toBe(false);
                    expect(output.querySelector('output')?.textContent).toBe('Rejected Owner');
                });
                expect(await requests[1]?.clone().json()).toEqual({ name: 'Rejected Owner' });
                expect(input.value).toBe('Rejected Owner');
                expect(errors).toHaveLength(1);
            },
            '/user/settings'
        );
    } finally {
        resolveSave(Response.json(user));
        transport.mockRestore();
    }
});

it.each(['  Owner  ', '   '])('does not save an unchanged or blank name on blur: %j', async (name) => {
    // Arrange
    const errors: unknown[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    try {
        await withMounted(
            <ApiErrorContext value={(error) => errors.push(error)}>
                <AccountSettings />
            </ApiErrorContext>,
            async (output) => {
                const events = userEvent.setup();
                const input = output.querySelector('input');

                if (!input) throw new Error('Username input is missing');
                expect(input.value).toBe('Owner');

                // Act
                await act(async () => {
                    await events.clear(input);
                    await events.type(input, name);
                    await events.tab();
                });

                // Assert
                expect(transport).not.toHaveBeenCalled();
                expect(output.querySelector('output')?.textContent).toBe('Owner');
                expect(input.readOnly).toBe(false);
                expect(errors).toEqual([]);
            },
            '/user/settings'
        );
    } finally {
        transport.mockRestore();
    }
});
