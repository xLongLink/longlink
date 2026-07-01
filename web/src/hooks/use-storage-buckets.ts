import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiStorageBucket } from '@/lib/types';

/** Fetches buckets for one storage registry. */
export function useStorageBuckets(storageId: string) {
    return useCollectionQuery<ApiStorageBucket>(storageId ? `/api/storages/${storageId}/buckets` : null, {
        enabled: storageId.length > 0,
        refetchOnMount: 'always',
    });
}
