import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiUserSummary } from '@/lib/types';

/** Fetches the full user list for admin views. */
export function useUsers() {
    return useCollectionQuery<ApiUserSummary>('/api/users', {
        refetchOnMount: 'always',
    });
}
