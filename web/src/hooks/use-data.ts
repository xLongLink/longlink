import { useQuery } from '@tanstack/react-query';

/**
 * Fetches JSON from an API endpoint using TanStack Query.
 */
export function useApiData<T>(endpoint: string | null) {
    return useQuery({
        queryKey: ['api', endpoint],
        queryFn: async () => {
            const response = await fetch(endpoint!, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as T;
        },
        enabled: Boolean(endpoint),
    });
}
