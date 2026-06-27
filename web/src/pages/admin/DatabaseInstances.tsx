import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Link, useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useDatabaseInstances } from '@/hooks/use-database-instances';
import { useDatabases } from '@/hooks/use-databases';
import type { ApiDatabaseInstance } from '@/lib/types';

/** Renders databases for a database backend. */
export default function DatabaseInstances() {
    const { database = '' } = useParams();

    const { items: registries, error: registriesError, isLoading: registriesIsLoading } = useDatabases();

    const databaseRegistry = registries.find((registry) => registry.slug === database);

    const databaseColumns: Array<ColumnDef<ApiDatabaseInstance>> = [
        {
            accessorKey: 'name',
            header: 'Database',
            cell: ({ row }) => (
                <Link
                    to={`/admin/database/${encodeURIComponent(database)}/databases/${encodeURIComponent(row.original.name)}`}
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

    const {
        items: rows,
        error: databasesError,
        isLoading: databasesIsLoading,
    } = useDatabaseInstances(databaseRegistry?.id ?? '');
    const error =
        registriesError ??
        (!registriesIsLoading && !databaseRegistry ? new Error(`Database "${database}" not found`) : databasesError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="database">
                    <div>
                        <HeroTitle>Databases</HeroTitle>
                        <HeroDescription>
                            Databases managed by database backend "{databaseRegistry?.name || database}".
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={databaseColumns}
                data={rows}
                error={error}
                isLoading={registriesIsLoading || databasesIsLoading}
                loadingLabel="Loading databases..."
            />
        </div>
    );
}
