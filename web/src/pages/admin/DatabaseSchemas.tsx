import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Layers } from 'lucide-react';
import { useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useApiQuery } from '@/hooks/use-api';
import type { ApiDatabaseRegistry, ApiDatabaseSchema } from '@/lib/types';

/** Renders schemas (namespaces) in a database on a database backend. */
export default function DatabaseSchemas() {
    const { database = '', dbname = '' } = useParams();

    const registriesQuery = useApiQuery<Array<ApiDatabaseRegistry>>('/api/database', {
        retry: false,
        refetchOnMount: 'always',
    });

    const databaseRegistry = registriesQuery.data?.find(
        (registry) => registry.slug === database || registry.id === database
    );
    const schemasPath = databaseRegistry
        ? `/api/database/${databaseRegistry.id}/databases/${encodeURIComponent(dbname)}/schemas`
        : null;

    const schemaColumns: Array<ColumnDef<ApiDatabaseSchema>> = [
        {
            accessorKey: 'name',
            header: 'Schema',
            cell: ({ row }) => <div className="truncate font-medium text-foreground">{row.original.name}</div>,
            meta: { className: 'min-w-56' },
        },
    ];

    const schemasQuery = useApiQuery<Array<ApiDatabaseSchema>>(schemasPath, {
        retry: false,
        refetchOnMount: 'always',
    });

    const rows = schemasQuery.data ?? [];
    const error =
        registriesQuery.error ??
        (!registriesQuery.isLoading && !databaseRegistry
            ? new Error(`Database "${database}" not found`)
            : schemasQuery.error);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Layers />}>
                    <div>
                        <HeroTitle>Schemas</HeroTitle>
                        <HeroDescription>
                            Schemas in database <span className="font-medium text-foreground">{dbname}</span> on
                            database backend "{databaseRegistry?.name || database}".
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={schemaColumns}
                data={rows}
                error={error}
                isLoading={registriesQuery.isLoading || schemasQuery.isLoading}
                loadingLabel="Loading schemas..."
            />
        </div>
    );
}
