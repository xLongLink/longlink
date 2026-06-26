import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiComputeRegistry } from '@/lib/types';

/** Fetches the compute registry list for admin views. */
export function useComputes() {
    return useCollectionQuery<ApiComputeRegistry>('/api/computes', {
        refetchOnMount: 'always',
    });
}
