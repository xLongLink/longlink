import type { ApiStorageRegistry } from '@/lib/types';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiStorageRegistrySchema, parseApiCollection } from '@/lib/api-schemas';

/** Fetches the storage registry list for admin views. */
export function useStorages() {
    return useCollectionQuery<ApiStorageRegistry>('/api/storages', {
        parse: (value) => parseApiCollection(apiStorageRegistrySchema, value),
    });
}
