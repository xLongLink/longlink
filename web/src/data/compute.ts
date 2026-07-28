import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiComputeRegistrySchema, parseApiCollection } from '@/lib/api-schemas';
import type { ApiComputeRegistry } from '@/lib/types';

/** Fetches the compute registry list for admin views. */
export function useComputes() {
    return useCollectionQuery<ApiComputeRegistry>('/api/computes', {
        refetchInterval: 5000,
        parse: (value) => parseApiCollection(apiComputeRegistrySchema, value),
    });
}
