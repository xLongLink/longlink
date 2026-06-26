import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiDatabaseRegistry } from '@/lib/types';

/** Fetches the database registry list for admin views. */
export function useDatabases() {
    return useCollectionQuery<ApiDatabaseRegistry>('/api/databases', {
        refetchOnMount: 'always',
    });
}
