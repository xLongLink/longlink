// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { user } from '../../render';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import Page from '@/platform/routes/user/Settings';
import userEvent from '@testing-library/user-event';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/** Publishes authoritative profile responses through the authenticated route context. */
function AccountSettings() {
    const currentUser = useQuery({ queryKey: ['api', '/api/v1/me'], initialData: user, enabled: false });

    return (
        <AuthenticatedUserContext value={currentUser.data}>
            <Page />
            <output aria-label="Authenticated account name">{currentUser.data.name}</output>
            <output aria-label="Authenticated account theme">{currentUser.data.theme}</output>
        </AuthenticatedUserContext>
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
                expect(output.querySelector('[aria-level="1"]')?.textContent).toBe('Canonical Owner');

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

/** Publishes profile changes through the same cache observed by the authenticated route. */
function AccountChanges() {
    const client = useQueryClient();

    return (
        <>
            <button
                type="button"
                onClick={() => client.setQueryData(['api', '/api/v1/me'], { ...user, theme: 'dark', accent: 'blue' })}
            >
                Update appearance
            </button>
            <button
                type="button"
                onClick={() =>
                    client.setQueryData(['api', '/api/v1/me'], {
                        ...user,
                        id: '00000000-0000-4000-8000-000000000003',
                        name: 'Another Owner',
                        email: 'another@example.com'
                    })
                }
            >
                Switch account
            </button>
        </>
    );
}

it('preserves a name draft through same-account appearance updates but resets it for a new identity', async () => {
    const transport = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected profile write'));

    try {
        await withMounted(
            <ApiErrorContext value={() => undefined}>
                <AccountSettings />
                <AccountChanges />
            </ApiErrorContext>,
            async (output) => {
                const events = userEvent.setup();
                const input = output.querySelector('input');

                if (!input) throw new Error('Username input is missing');

                const updateAppearance = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Update appearance'
                );

                if (!updateAppearance) throw new Error('Appearance update control is missing');
                await act(async () => {
                    await events.clear(input);
                    await events.type(input, 'Unsaved Owner');
                    updateAppearance.click();
                });
                await vi.waitFor(() => {
                    expect(output.querySelector('[aria-label="Authenticated account theme"]')?.textContent).toBe(
                        'dark'
                    );
                    expect(output.querySelector('input')).toBe(input);
                    expect(input.value).toBe('Unsaved Owner');
                    expect(output.querySelector('output')?.textContent).toBe('Owner');
                });

                const switchAccount = Array.from(output.querySelectorAll('button')).find(
                    (button) => button.textContent === 'Switch account'
                );

                if (!switchAccount) throw new Error('Account switch control is missing');
                await act(async () => switchAccount.click());
                await vi.waitFor(() => {
                    expect(output.querySelector('input')?.value).toBe('Another Owner');
                    expect(output.querySelector('[aria-level="1"]')?.textContent).toBe('Another Owner');
                    expect(output.textContent).toContain('another@example.com');
                });
                expect(transport).not.toHaveBeenCalled();
            },
            '/user/settings'
        );
    } finally {
        transport.mockRestore();
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
                expect(output.querySelector('[aria-level="1"]')?.textContent).toBe('Rejected Owner');
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
