import { useQuery } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Layers } from 'lucide-react';
import { useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiDatabaseSchema } from '@/lib/types';

/** Renders schemas (namespaces) in a database on a database backend. */
export default function DatabaseSchemas() {
    const { database = '', dbname = '' } = useParams();
    const encodedDatabase = encodeURIComponent(database);
    const encodedDbname = encodeURIComponent(dbname);
    const schemasUrl = apiUrl(`/api/database/${encodedDatabase}/databases/${encodedDbname}/schemas`);

    const schemaColumns: Array<ColumnDef<ApiDatabaseSchema>> = [
        {
            accessorKey: 'name',
            header: 'Schema',
            cell: ({ row }) => <div className="truncate font-medium text-foreground">{row.original.name}</div>,
            meta: { className: 'min-w-56' },
        },
    ];

    const schemasQuery = useQuery({
        queryKey: ['api', schemasUrl],
        queryFn: async () => fetchApiJson<Array<ApiDatabaseSchema>>(schemasUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    const rows = schemasQuery.data ?? [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Layers />}>
                    <div>
                        <HeroTitle>Schemas</HeroTitle>
                        <HeroDescription>
                            Schemas in database <span className="font-medium text-foreground">{dbname}</span> on
                            database backend "{database}".
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={schemaColumns}
                data={rows}
                error={schemasQuery.error}
                isLoading={schemasQuery.isLoading}
                loadingLabel="Loading schemas..."
            />
        </div>
    );
}
