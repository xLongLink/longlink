import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiComputeNamespace } from '@/lib/types';

/** Fetches namespaces for one compute registry. */
export function useComputeNamespaces(computeId: string) {
    return useCollectionQuery<ApiComputeNamespace>(computeId ? `/api/computes/${computeId}/namespaces` : null, {
        enabled: computeId.length > 0,
        refetchOnMount: 'always',
    });
}
