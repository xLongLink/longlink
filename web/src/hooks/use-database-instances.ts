import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiDatabaseInstance } from '@/lib/types';

/** Fetches databases for one database registry. */
export function useDatabaseInstances(databaseId: string) {
    return useCollectionQuery<ApiDatabaseInstance>(databaseId ? `/api/databases/${databaseId}/databases` : null, {
        enabled: databaseId.length > 0,
        refetchOnMount: 'always',
    });
}
