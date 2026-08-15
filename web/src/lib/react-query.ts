import { QueryClient } from '@tanstack/react-query';

/** Creates an isolated query cache for one browser or prerendered document. */
export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60_000,
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    });
}

/** Cancels and removes cached API data from the previous identity. */
export async function clearSessionQueries(client: QueryClient): Promise<void> {
    const isSessionQuery = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === 'api';

    // Stop requests from the previous identity before removing their cached results.
    await client.cancelQueries({ predicate: isSessionQuery });
    client.removeQueries({ predicate: isSessionQuery });
}
