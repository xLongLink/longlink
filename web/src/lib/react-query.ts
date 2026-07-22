import { hashKey, QueryClient, type QueryKey } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

/** Cancels and removes cached API data except for observers that callers will reseed. */
export async function clearSessionQueries(client: QueryClient, preserve: QueryKey[] = []): Promise<void> {
    const preservedHashes = new Set(preserve.map((key) => hashKey(key)));
    const isSessionQuery = (query: { queryHash: string; queryKey: readonly unknown[] }) =>
        query.queryKey[0] === 'api' && !preservedHashes.has(query.queryHash);

    // Stop requests from the previous identity before removing their cached results.
    await client.cancelQueries({ predicate: isSessionQuery });
    client.removeQueries({ predicate: isSessionQuery });
}
