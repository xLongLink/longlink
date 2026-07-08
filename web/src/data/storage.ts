import { useCollectionQuery } from '@/hooks/use-collection-query';
import {
    apiStorageBucketSchema,
    apiStorageObjectSchema,
    apiStorageRegistrySchema,
    parseApiCollection,
} from '@/lib/api-schemas';
import type { ApiStorageBucket, ApiStorageObject, ApiStorageRegistry } from '@/lib/types';

/** Fetches the storage registry list for admin views. */
export function useStorages() {
    return useCollectionQuery<ApiStorageRegistry>('/api/storages', {
        parse: (value) => parseApiCollection(apiStorageRegistrySchema, value),
    });
}


/** Fetches buckets for one storage registry. */
export function useStorageBuckets(storageId: string) {
    const enabled = storageId.length > 0;

    return useCollectionQuery<ApiStorageBucket>(enabled ? `/api/storages/${storageId}/buckets` : null, {
        enabled,
        parse: (value) => parseApiCollection(apiStorageBucketSchema, value),
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
