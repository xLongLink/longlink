import type { ApiDatabaseRegistry } from '@/lib/types';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiDatabaseRegistrySchema, parseApiCollection } from '@/lib/api-schemas';

/** Fetches the database registry list for admin views. */
export function useDatabases() {
    return useCollectionQuery<ApiDatabaseRegistry>('/api/databases', {
        parse: (value) => parseApiCollection(apiDatabaseRegistrySchema, value),
    });
}
