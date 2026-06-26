import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiStorageRegistry } from '@/lib/types';

/** Fetches the storage registry list for admin views. */
export function useStorages() {
    return useCollectionQuery<ApiStorageRegistry>('/api/storages', {
        refetchOnMount: 'always',
    });
}
