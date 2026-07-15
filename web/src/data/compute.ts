import { z } from 'zod';
import type { ApiComputePod, ApiComputeRegistry } from '@/lib/types';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiComputePodSchema, apiComputeRegistrySchema, parseApiCollection } from '@/lib/api-schemas';

/** Fetches the compute registry list for admin views. */
export function useComputes() {
    return useCollectionQuery<ApiComputeRegistry>('/api/computes', {
        parse: (value) => parseApiCollection(apiComputeRegistrySchema, value),
    });
}

/** Fetches namespaces for one compute registry. */
export function useComputeNamespaces(computeId: string) {
    const enabled = computeId.length > 0;

    return useCollectionQuery<string>(enabled ? `/api/computes/${computeId}/namespaces` : null, {
        enabled,
        parse: (value) => parseApiCollection(z.string(), value),
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
