import { ApiError } from '@/lib/api';
import { createErrorReporter, isCanceledRequest } from '@/lib/errors';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

/** Creates an isolated query cache for one browser or prerendered document. */
export function createQueryRuntime(notify: (message: string) => void, platformSession: boolean) {
    let client: QueryClient;
    const notifyError = createErrorReporter(notify);
    const failedQueries = new WeakMap<object, string>();

    /** Apply session policy consistently to cached and direct requests. */
    function reportError(error: unknown, notify = true) {
        if (isCanceledRequest(error)) return;
        if (platformSession && error instanceof ApiError && error.status === 401 && error.url !== '') {
            const url = new URL(error.url);

            // Reuse the cancellable identity query; a Solution 401 does not prove session loss.
            if (
                typeof window !== 'undefined' &&
                url.origin === window.location.origin &&
                url.pathname.startsWith('/api/v1/')
            ) {
                void client
                    .invalidateQueries({ queryKey: ['api', '/api/v1/me'], exact: true }, { cancelRefetch: false })
                    .catch(notifyError);
            }
        }
        if (notify) notifyError(error);
    }

    const queryCache = new QueryCache({
        onError: (error, query) => {
            if (isCanceledRequest(error)) return;

            // Only the identity read establishes anonymous state; writes still report their failure.
            if (
                platformSession &&
                query.queryKey[0] === 'api' &&
                query.queryKey[1] === '/api/v1/me' &&
                error instanceof ApiError &&
                error.status === 401
            ) {
                const identity = query.state;
                void clearSessionQueries(client, true)
                    .then(() => {
                        if (query.state === identity) client.setQueryData(query.queryKey, null);
                    })
                    .catch(notifyError);
                return;
            }

            // Suppress repeated polling notifications, never status handling or changed failures.
            const incident = error instanceof ApiError ? `${error.status}:${error.message}` : error.name;
            const repeated = query.meta?.polling === true && failedQueries.get(query) === incident;
            failedQueries.set(query, incident);
            reportError(error, !repeated);
        },
        onSuccess: (_data, query) => {
            failedQueries.delete(query);
        },
    });

    client = new QueryClient({
        queryCache,
        mutationCache: new MutationCache({ onError: (error) => reportError(error) }),
        defaultOptions: {
            queries: {
                staleTime: 60_000,
                refetchOnWindowFocus: false,
                retry: (failureCount, error) =>
                    !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
            },
        },
    });

    // A focus refresh may discover an account switch performed in another tab.
    let userId: string | null = null;
    queryCache.subscribe((event) => {
        if (
            !platformSession ||
            event.type !== 'updated' ||
            event.action.type !== 'success' ||
            event.query.queryKey[0] !== 'api' ||
            event.query.queryKey[1] !== '/api/v1/me'
        )
            return;
        const user: unknown = event.query.state.data;
        const nextUserId =
            user !== null && typeof user === 'object' && 'id' in user && typeof user.id === 'string' ? user.id : null;
        const changedAccount = userId !== null && nextUserId !== null && userId !== nextUserId;
        userId = nextUserId;
        if (changedAccount) void clearSessionQueries(client, true).catch(notifyError);
    });

    return { client, reportError };
}

/** Cancels and removes cached API data from the previous identity. */
export async function clearSessionQueries(client: QueryClient, preserveCurrentUser = false): Promise<void> {
    const identity = client.getQueryData(['api', '/api/v1/me']);
    const isSessionQuery = (query: { queryKey: readonly unknown[] }) =>
        query.queryKey[0] === 'api' && (!preserveCurrentUser || query.queryKey[1] !== '/api/v1/me');

    // Stop requests from the previous identity before removing their cached results.
    await client.cancelQueries({ predicate: isSessionQuery });
    if (client.getQueryData(['api', '/api/v1/me']) === identity) {
        client.removeQueries({ predicate: isSessionQuery });
    }
}
