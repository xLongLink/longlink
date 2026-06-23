import { useQuery } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Database } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiDatabaseDatabase } from '@/lib/types';

/** Renders databases for a database backend. */
export default function DatabaseDatabases() {
    const { database = '' } = useParams();
    const encodedDatabase = encodeURIComponent(database);
    const databasesUrl = apiUrl(`/api/database/${encodedDatabase}/databases`);

    const databaseColumns: Array<ColumnDef<ApiDatabaseDatabase>> = [
        {
            accessorKey: 'name',
            header: 'Database',
            cell: ({ row }) => (
                <Link
                    to={`/admin/database/${encodedDatabase}/database/${encodeURIComponent(row.original.name)}`}
                    className="flex items-center gap-3"
                >
                    <img
                        src="/images/Postgresql.png"
                        alt="PostgreSQL"
                        className="size-10 rounded-md border border-border bg-background object-contain p-1"
                    />
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground underline-offset-4 hover:underline">
                            {row.original.name}
                        </div>
                    </div>
                </Link>
            ),
            meta: { className: 'min-w-56' },
        },
    ];

    const databasesQuery = useQuery({
        queryKey: ['api', databasesUrl],
        queryFn: async () => fetchApiJson<Array<ApiDatabaseDatabase>>(databasesUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    const rows = databasesQuery.data ?? [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Database />}>
                    <div>
                        <HeroTitle>Databases</HeroTitle>
                        <HeroDescription>Databases managed by database backend "{database}".</HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={databaseColumns}
                data={rows}
                error={databasesQuery.error}
                isLoading={databasesQuery.isLoading}
                loadingLabel="Loading databases..."
            />
        </div>
    );
}
