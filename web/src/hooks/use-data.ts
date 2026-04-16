import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';

/** Hook that fetches data from an API endpoint using TanStack Query. */
export function useApiData<T>(endpoint: string | null) {
    return useQuery({
        queryKey: ['api', endpoint],
        queryFn: () => apiFetch<T>(endpoint!),
        enabled: Boolean(endpoint),
    });
}
