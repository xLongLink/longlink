import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiComputePod } from '@/lib/types';

/** Fetches pods for one namespace in a compute registry. */
export function useComputePods(computeId: string, namespace: string) {
    return useCollectionQuery<ApiComputePod>(
        computeId && namespace ? `/api/computes/${computeId}/namespaces/${encodeURIComponent(namespace)}/pods` : null,
        {
            enabled: computeId.length > 0 && namespace.length > 0,
            refetchOnMount: 'always',
        }
    );
}
