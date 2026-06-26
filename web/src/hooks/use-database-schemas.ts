import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { ApiDatabaseSchema } from '@/lib/types';

/** Fetches schemas for one database inside a registry. */
export function useDatabaseSchemas(databaseId: string, databaseName: string) {
    return useCollectionQuery<ApiDatabaseSchema>(
        databaseId && databaseName
            ? `/api/databases/${databaseId}/databases/${encodeURIComponent(databaseName)}/schemas`
            : null,
        {
            enabled: databaseId.length > 0 && databaseName.length > 0,
            refetchOnMount: 'always',
        }
    );
}
