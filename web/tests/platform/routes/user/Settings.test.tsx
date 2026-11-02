// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { withMounted } from '../../../render';
import { ApiErrorContext } from '@/lib/errors';
import { useQuery } from '@tanstack/react-query';
import Page from '@/platform/routes/user/Settings';
import { renderPlatform, user } from '../../render';
import userEvent from '@testing-library/user-event';
import { AuthenticatedUserContext } from '@/lib/hooks/use-user';

/** Publishes authoritative profile responses through the authenticated route context. */
function AccountSettings() {
    const currentUser = useQuery({ queryKey: ['api', '/api/v1/me'], initialData: user, enabled: false });

    return (
        <AuthenticatedUserContext value={currentUser.data}>
            <Page />
            <output aria-label="Authenticated account name">{currentUser.data.name}</output>
        </AuthenticatedUserContext>
    );
}

it('loads the account draft without requesting inactive organization settings', () => {
    // Act
    const output = renderPlatform(<Page />, '/user/settings');

    // Assert
    expect(output.querySelector('input')?.getAttribute('value')).toBe('Owner');
    expect(output.textContent).toContain('owner@example.com');
});

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
                    'PATCH /api/v1/me',
                ]);
                expect(await requests[0]?.clone().json()).toEqual({ name: 'Updated Owner' });
                expect(output.querySelector('output')?.textContent).toBe('Owner');

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

it('restores the authoritative account name and permits editing after a failed blur save', async () => {
    // Arrange
    const errors: unknown[] = [];
    let resolveSave: (response: Response) => void = () => undefined;

    const saveResponse = new Promise<Response>((resolve) => {
        resolveSave = resolve;
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

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
                    expect(input.value).toBe('Owner');
                    expect(errors).toHaveLength(1);
                });
                expect(output.querySelector('[aria-level="1"]')?.textContent).toBe('Owner');
                expect(output.querySelector('output')?.textContent).toBe('Owner');
                expect(errors[0]).toMatchObject({ message: 'Profile could not be saved', status: 500 });

                // Act
                await act(async () => {
                    await events.clear(input);
                    await events.type(input, 'Retry Owner');
                });

                // Assert
                expect(input.value).toBe('Retry Owner');
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
