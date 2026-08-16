import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

/** Creates an isolated query cache for one browser or prerendered document. */
export function createQueryClient(): QueryClient {
    let client: QueryClient;
    const queryCache = new QueryCache({
        onError: (error, query) => {
            // Clear only API data when an API request loses its authenticated session.
            if (query.queryKey[0] === 'api' && error instanceof ApiError && error.status === 401) {
                void clearSessionQueries(client).then(() => {
                    client.setQueryData(['api', '/api/v1/me'], null);
                });
            }
        },
    });

    client = new QueryClient({
        queryCache,
        defaultOptions: {
            queries: {
                staleTime: 60_000,
                refetchOnWindowFocus: false,
                retry: (failureCount, error) =>
                    !(error instanceof ApiError && error.status === 401) && failureCount < 1,
            },
        },
    });

    return client;
}

/** Cancels and removes cached API data from the previous identity. */
export async function clearSessionQueries(client: QueryClient): Promise<void> {
    const isSessionQuery = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === 'api';

    // Stop requests from the previous identity before removing their cached results.
    await client.cancelQueries({ predicate: isSessionQuery });
    client.removeQueries({ predicate: isSessionQuery });
}
