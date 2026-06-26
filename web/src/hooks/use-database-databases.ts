import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiDatabaseDatabase } from '@/lib/types';

/** Fetches databases for one database registry. */
export function useDatabaseDatabases(databaseId: string) {
    return useCollectionQuery<ApiDatabaseDatabase>(databaseId ? `/api/databases/${databaseId}/databases` : null, {
        enabled: databaseId.length > 0,
        refetchOnMount: 'always',
    });
}
