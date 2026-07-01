import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiStorageObject } from '@/lib/types';

/** Fetches object metadata for one storage bucket. */
export function useStorageObjects(storageId: string, bucketName: string) {
    return useCollectionQuery<ApiStorageObject>(
        storageId && bucketName ? `/api/storages/${storageId}/buckets/${encodeURIComponent(bucketName)}/objects` : null,
        {
            enabled: storageId.length > 0 && bucketName.length > 0,
            refetchOnMount: 'always',
        }
    );
}
