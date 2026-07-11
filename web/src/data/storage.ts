import { z } from 'zod';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiStorageObjectSchema, apiStorageRegistrySchema, parseApiCollection } from '@/lib/api-schemas';
import type { ApiStorageObject, ApiStorageRegistry } from '@/lib/types';

/** Fetches the storage registry list for admin views. */
export function useStorages() {
    return useCollectionQuery<ApiStorageRegistry>('/api/storages', {
        parse: (value) => parseApiCollection(apiStorageRegistrySchema, value),
    });
}

/** Fetches buckets for one storage registry. */
export function useStorageBuckets(storageId: string) {
    const enabled = storageId.length > 0;

    return useCollectionQuery<string>(enabled ? `/api/storages/${storageId}/buckets` : null, {
        enabled,
        parse: (value) => parseApiCollection(z.string(), value),
    });
}

/** Fetches object metadata for one storage bucket. */
export function useStorageObjects(storageId: string, bucketName: string) {
    const enabled = storageId.length > 0 && bucketName.length > 0;

    return useCollectionQuery<ApiStorageObject>(
        enabled ? `/api/storages/${storageId}/buckets/${encodeURIComponent(bucketName)}/objects` : null,
        {
            enabled,
            parse: (value) => parseApiCollection(apiStorageObjectSchema, value),
        }
    );
}
