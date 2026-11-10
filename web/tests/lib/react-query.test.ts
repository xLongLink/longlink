// @vitest-environment happy-dom
// @vitest-environment-options {"url":"http://localhost"}
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { it, expect, vi } from 'vitest';
import { apiQueryOptions, createQueryRuntime } from '@/lib/react-query';
import { QueryObserver, isCancelledError } from '@tanstack/react-query';

it('automatically cancels and removes prior-account API queries when a new identity is published', async () => {
    // Arrange
    const runtime = createQueryRuntime(() => undefined, true);
    const identityKey = ['api', '/api/v1/me'];
    const privateKey = ['api', '/api/v1/organizations'];
    const pendingKey = ['api', '/api/v1/invitations'];
    const runtimeKey = ['view-runtime', 'version'];
    let pendingSignal: AbortSignal | undefined;
    let release: ((data: string[]) => void) | undefined;

    const response = new Promise<string[]>((resolve) => {
        release = resolve;
    });

    let pending: Promise<unknown> | undefined;

    try {
        runtime.client.setQueryData(identityKey, { id: 'account-a' });
        runtime.client.setQueryData(privateKey, ['private-a']);
        runtime.client.setQueryData(runtimeKey, 'runtime');
        pending = runtime.client
            .fetchQuery({
                queryKey: pendingKey,
                retry: false,
                queryFn: ({ signal }) => {
                    pendingSignal = signal;

                    return response;
                },
            })
            .catch((error: Error) => error);
        expect(pendingSignal?.aborted).toBe(false);
        expect(runtime.client.getQueryState(pendingKey)?.fetchStatus).toBe('fetching');

        // Act
        runtime.client.setQueryData(identityKey, { id: 'account-b' });

        // Assert
        await vi.waitFor(() => {
            expect(pendingSignal?.aborted).toBe(true);
            expect(runtime.client.getQueryState(privateKey)).toBeUndefined();
            expect(runtime.client.getQueryState(pendingKey)).toBeUndefined();
        });
        expect(isCancelledError(await pending)).toBe(true);
        expect(runtime.client.getQueryData(identityKey)).toEqual({ id: 'account-b' });
        expect(runtime.client.getQueryData(runtimeKey)).toBe('runtime');
    } finally {
        runtime.client.clear();
        release?.(['late-private-a']);
        await pending;
    }
});

it('revalidates resource 401s without losing a valid session, but clears private data on an identity 401', async () => {
    // Arrange
    const messages: string[] = [];
    const runtime = createQueryRuntime((message) => messages.push(message), true);
    const identityOptions = apiQueryOptions('/api/v1/me', z.object({ id: z.string() }).nullable());
    const privateKey = ['api', '/api/v1/organizations'];

    const transport = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Unexpected session request'))
        .mockResolvedValueOnce(Response.json({ id: 'account-a' }))
        .mockResolvedValueOnce(Response.json({ detail: 'Resource credentials expired' }, { status: 401 }))
        .mockResolvedValueOnce(Response.json({ id: 'account-a' }))
        .mockResolvedValueOnce(Response.json({ detail: 'Session expired' }, { status: 401 }));

    const observer = new QueryObserver(runtime.client, identityOptions);
    let unsubscribe: (() => void) | undefined;

    try {
        unsubscribe = observer.subscribe(() => undefined);
        await vi.waitFor(() => expect(observer.getCurrentResult().isSuccess).toBe(true));
        runtime.client.setQueryData(privateKey, ['private-a']);

        // Act
        const resource = runtime.client.fetchQuery(apiQueryOptions('/api/v1/protected', z.object({ id: z.string() })));

        // Assert
        await expect(resource).rejects.toBeInstanceOf(ApiError);
        await expect(resource).rejects.toMatchObject({ status: 401, message: 'Resource credentials expired' });
        await vi.waitFor(() => {
            expect(transport).toHaveBeenCalledTimes(3);
            expect(observer.getCurrentResult().fetchStatus).toBe('idle');
        });
        expect(observer.getCurrentResult().data).toEqual({ id: 'account-a' });
        expect(transport.mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)))).toEqual([
            'http://localhost/api/v1/me',
            'http://localhost/api/v1/protected',
            'http://localhost/api/v1/me',
        ]);
        expect(runtime.client.getQueryData(privateKey)).toEqual(['private-a']);
        expect(messages).toEqual(['Resource credentials expired']);

        // Act
        const identity = observer.refetch({ throwOnError: true });

        // Assert
        await expect(identity).rejects.toBeInstanceOf(ApiError);
        await expect(identity).rejects.toMatchObject({ status: 401, message: 'Session expired' });
        await vi.waitFor(() => {
            expect(observer.getCurrentResult().data).toBeNull();
            expect(runtime.client.getQueryState(privateKey)).toBeUndefined();
        });
        expect(transport).toHaveBeenCalledTimes(4);
        expect(messages).toEqual(['Resource credentials expired']);
    } finally {
        unsubscribe?.();
        observer.destroy();
        runtime.client.clear();
        transport.mockRestore();
    }
});

it('reports a polling incident once until success resets it, even beyond generic message deduplication', async () => {
    // Arrange
    const messages: string[] = [];
    const runtime = createQueryRuntime((message) => messages.push(message), false);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const firstFailure = new ApiError('Deployment unavailable', 503);
    const repeatedFailure = new ApiError('Deployment unavailable', 503);
    const recurringFailure = new ApiError('Deployment unavailable', 503);

    const queryFn = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(firstFailure)
        .mockRejectedValueOnce(repeatedFailure)
        .mockResolvedValueOnce('ready')
        .mockRejectedValueOnce(recurringFailure);

    const options = {
        queryKey: ['api', '/api/v1/deployment'],
        queryFn,
        retry: false,
        staleTime: 0,
        meta: { polling: true },
    };

    try {
        // Act / Assert
        await expect(runtime.client.fetchQuery(options)).rejects.toBe(firstFailure);
        expect(messages).toEqual(['Deployment unavailable']);

        clock.mockReturnValue(16_000);
        await expect(runtime.client.fetchQuery(options)).rejects.toBe(repeatedFailure);
        expect(messages).toEqual(['Deployment unavailable']);

        clock.mockReturnValue(22_000);
        await expect(runtime.client.fetchQuery(options)).resolves.toBe('ready');
        expect(messages).toEqual(['Deployment unavailable']);

        clock.mockReturnValue(28_000);
        await expect(runtime.client.fetchQuery(options)).rejects.toBe(recurringFailure);
        expect(messages).toEqual(['Deployment unavailable', 'Deployment unavailable']);
    } finally {
        runtime.client.clear();
        clock.mockRestore();
    }
});
