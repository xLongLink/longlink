import { z } from 'zod';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiDatabaseRegistrySchema, parseApiCollection } from '@/lib/api-schemas';
import type { ApiDatabaseRegistry } from '@/lib/types';

/** Fetches the database registry list for admin views. */
export function useDatabases() {
    return useCollectionQuery<ApiDatabaseRegistry>('/api/databases', {
        parse: (value) => parseApiCollection(apiDatabaseRegistrySchema, value),
    });
}

/** Fetches databases for one database registry. */
export function useDatabaseInstances(databaseId: string) {
    const enabled = databaseId.length > 0;

    return useCollectionQuery<string>(enabled ? `/api/databases/${databaseId}/databases` : null, {
        enabled,
        parse: (value) => parseApiCollection(z.string(), value),
    });
}

/** Fetches schemas for one database inside a registry. */
export function useDatabaseSchemas(databaseId: string, databaseName: string) {
    const enabled = databaseId.length > 0 && databaseName.length > 0;

    return useCollectionQuery<string>(
        enabled ? `/api/databases/${databaseId}/databases/${encodeURIComponent(databaseName)}/schemas` : null,
        {
            enabled,
            parse: (value) => parseApiCollection(z.string(), value),
        }
    );
}
