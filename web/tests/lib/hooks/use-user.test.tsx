// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { act } from 'react';
import { it, expect, vi } from 'vitest';
import { ApiErrorContext } from '@/lib/errors';
import { renderStatic, withMounted } from '../../render';
import { zCurrentUser } from '@/lib/generated/platform-api-v1/zod.gen';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateUser, useAuthenticatedUser, AuthenticatedUserContext } from '@/lib/hooks/use-user';

const userKey = ['api', '/api/v1/me'];

const user = zCurrentUser.parse({
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Owner',
    email: 'owner@example.com',
    avatar: 'owner.svg',
    administrator: false,
    theme: 'system',
    accent: 'neutral',
});

const newerUser = zCurrentUser.parse({
    ...user,
    name: 'Refreshed Owner',
    email: 'refreshed@example.com',
    avatar: 'refreshed.svg',
    theme: 'light',
    accent: 'green',
});

/** Holds the HTTP boundary open until a test releases the response. */
function deferredResponse() {
    let resolve: (response: Response) => void = () => undefined;

    const promise = new Promise<Response>((release) => {
        resolve = release;
    });

    return { promise, resolve };
}

/** Reads the same authenticated context used by account consumers. */
function AccountSnapshot() {
    return <output aria-label="Account">{JSON.stringify(useAuthenticatedUser())}</output>;
}

/** Mounts independent profile controls against a live cache observer. */
function AccountControls() {
    const currentUser = useQuery({ queryKey: userKey, initialData: user, enabled: false });
    const profile = useUpdateUser();
    const appearance = useUpdateUser();

    return (
        <AuthenticatedUserContext value={currentUser.data}>
            <button name="profile" onClick={() => profile.mutate({ name: 'Updated Owner' })}>
                Save name
            </button>
            <button name="appearance" onClick={() => appearance.mutate({ theme: 'dark', accent: 'violet' })}>
                Save appearance
            </button>
            <output aria-label="Appearance status">
                {appearance.status}:{appearance.isPaused ? 'queued' : 'active'}
            </output>
            <AccountSnapshot />
        </AuthenticatedUserContext>
    );
}

it('fails explicitly when used outside the authenticated route boundary', () => {
    // Arrange
    function Probe() {
        return useAuthenticatedUser().name;
    }

    // Act / Assert
    expect(() => renderStatic(<Probe />)).toThrow('useAuthenticatedUser must be used within an authenticated route');
});

it('serializes independent account controls and publishes canonical responses before the next appearance preview', async () => {
    // Arrange
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const nameResponse = deferredResponse();
    const appearanceResponse = deferredResponse();
    const requests: Request[] = [];
    const snapshots: unknown[] = [];
    const canonicalName = { ...user, name: 'Canonical Owner', avatar: 'canonical.svg' };
    const preview = { ...canonicalName, theme: 'dark', accent: 'violet' };
    const canonicalAppearance = { ...canonicalName, theme: 'light', accent: 'indigo' };

    const unsubscribe = client.getQueryCache().subscribe((event) => {
        if (event.type === 'updated' && event.action.type === 'success') snapshots.push(event.query.state.data);
    });

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (request.method !== 'PATCH' || new URL(request.url).pathname !== '/api/v1/me') {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        requests.push(request);

        return requests.length === 1 ? nameResponse.promise : appearanceResponse.promise;
    });

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={() => undefined}>
                    <AccountControls />
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                // Act
                await act(async () => output.querySelector<HTMLButtonElement>('button[name="profile"]')?.click());
                await vi.waitFor(() => expect(requests).toHaveLength(1));
                await act(async () => output.querySelector<HTMLButtonElement>('button[name="appearance"]')?.click());

                // Assert
                await vi.waitFor(() =>
                    expect(output.querySelector('[aria-label="Appearance status"]')?.textContent).toBe('pending:queued')
                );
                expect(requests).toHaveLength(1);
                expect(await requests[0]?.clone().json()).toEqual({ name: 'Updated Owner' });
                expect(client.getQueryData(userKey)).toEqual(user);
                expect(output.querySelector('[aria-label="Account"]')?.textContent).toBe(JSON.stringify(user));
                expect(snapshots).toEqual([]);

                // Act
                await act(async () => nameResponse.resolve(Response.json(canonicalName)));
                await vi.waitFor(() => expect(requests).toHaveLength(2));

                // Assert
                expect(await requests[1]?.clone().json()).toEqual({
                    theme: 'dark',
                    accent: 'violet',
                });
                expect(snapshots).toEqual([canonicalName, preview]);
                expect(client.getQueryData(userKey)).toEqual(preview);
                await vi.waitFor(() =>
                    expect(output.querySelector('[aria-label="Account"]')?.textContent).toBe(JSON.stringify(preview))
                );

                // Act
                await act(async () => appearanceResponse.resolve(Response.json(canonicalAppearance)));

                // Assert
                await vi.waitFor(() =>
                    expect(output.querySelector('[aria-label="Appearance status"]')?.textContent).toBe('success:active')
                );
                expect(client.isMutating()).toBe(0);
                expect(requests).toHaveLength(2);
                expect(snapshots).toEqual([canonicalName, preview, canonicalAppearance]);
                expect(client.getQueryData(userKey)).toEqual(canonicalAppearance);
                expect(output.querySelector('[aria-label="Account"]')?.textContent).toBe(
                    JSON.stringify(canonicalAppearance)
                );
            }
        );
    } finally {
        nameResponse.resolve(Response.json(user));
        appearanceResponse.resolve(Response.json(user));

        try {
            await vi.waitFor(() => expect(client.isMutating()).toBe(0));
        } finally {
            unsubscribe();
            client.clear();
            transport.mockRestore();
        }
    }
});

it.each([
    { behavior: 'rolls back appearance without losing profile fields', refresh: undefined, expected: user },
    {
        behavior: 'preserves a newer account snapshot instead of rolling it back',
        refresh: newerUser,
        expected: newerUser,
    },
])('$behavior after a failed appearance save', async ({ refresh, expected }) => {
    // Arrange
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const response = deferredResponse();
    const requests: Request[] = [];

    const transport = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
        const request = input instanceof Request ? input : new Request(input, options);

        if (request.method !== 'PATCH' || new URL(request.url).pathname !== '/api/v1/me') {
            throw new Error(`Unexpected request: ${request.method} ${request.url}`);
        }

        requests.push(request);

        return response.promise;
    });

    try {
        await withMounted(
            <QueryClientProvider client={client}>
                <ApiErrorContext value={() => undefined}>
                    <AccountControls />
                </ApiErrorContext>
            </QueryClientProvider>,
            async (output) => {
                // Act
                await act(async () => output.querySelector<HTMLButtonElement>('button[name="appearance"]')?.click());
                await vi.waitFor(() => expect(requests).toHaveLength(1));

                // Assert
                const preview = { ...user, theme: 'dark', accent: 'violet' };
                expect(client.getQueryData(userKey)).toEqual(preview);
                await vi.waitFor(() =>
                    expect(output.querySelector('[aria-label="Account"]')?.textContent).toBe(JSON.stringify(preview))
                );

                // Act
                await act(async () => {
                    if (refresh) client.setQueryData(userKey, refresh);
                    response.resolve(Response.json({ detail: 'Appearance could not be saved' }, { status: 500 }));
                });

                // Assert
                await vi.waitFor(() =>
                    expect(output.querySelector('[aria-label="Appearance status"]')?.textContent).toBe('error:active')
                );
                expect(client.isMutating()).toBe(0);
                expect(requests).toHaveLength(1);
                expect(client.getQueryData(userKey)).toEqual(expected);
                expect(output.querySelector('[aria-label="Account"]')?.textContent).toBe(JSON.stringify(expected));
            }
        );
    } finally {
        response.resolve(Response.json(user));

        try {
            await vi.waitFor(() => expect(client.isMutating()).toBe(0));
        } finally {
            client.clear();
            transport.mockRestore();
        }
    }
});
