import { useCollectionQuery } from '@/hooks/use-collection-query';
import {
    apiComputeNamespaceSchema,
    apiComputePodSchema,
    apiComputeRegistrySchema,
    parseApiCollection,
} from '@/lib/api-schemas';
import type { ApiComputeNamespace, ApiComputePod, ApiComputeRegistry } from '@/lib/types';

/** Fetches the compute registry list for admin views. */
export function useComputes() {
    return useCollectionQuery<ApiComputeRegistry>('/api/computes', {
        parse: (value) => parseApiCollection(apiComputeRegistrySchema, value),
    });
}

/** Fetches namespaces for one compute registry. */
export function useComputeNamespaces(computeId: string) {
    const enabled = computeId.length > 0;

    return useCollectionQuery<ApiComputeNamespace>(enabled ? `/api/computes/${computeId}/namespaces` : null, {
        enabled,
        parse: (value) => parseApiCollection(apiComputeNamespaceSchema, value),
    });
}

/** Fetches pods for one namespace in a compute registry. */
export function useComputePods(computeId: string, namespace: string) {
    const enabled = computeId.length > 0 && namespace.length > 0;

    return useCollectionQuery<ApiComputePod>(
        enabled ? `/api/computes/${computeId}/namespaces/${encodeURIComponent(namespace)}/pods` : null,
        {
            enabled,
            parse: (value) => parseApiCollection(apiComputePodSchema, value),
        }
    );
}
