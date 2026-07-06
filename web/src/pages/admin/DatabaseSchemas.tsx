import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useDatabaseSchemas } from '@/hooks/use-database-schemas';
import { useDatabases } from '@/hooks/use-databases';
import { useTranslation } from '@/lib/i18n';
import type { ApiDatabaseSchema } from '@/lib/types';

/** Renders schemas (namespaces) in a database on a database backend. */
export default function DatabaseSchemas() {
    const { t } = useTranslation();
    const { database = '', databaseName = '' } = useParams();

    const { items: registries, error: registriesError, isLoading: registriesIsLoading } = useDatabases();

    const databaseRegistry = registries.find((registry) => registry.slug === database);

    const schemaColumns: Array<ColumnDef<ApiDatabaseSchema>> = [
        {
            accessorKey: 'name',
            header: t('columns.schema'),
            cell: ({ row }) => <div className="truncate font-medium text-foreground">{row.original.name}</div>,
            meta: { className: 'min-w-56' },
        },
    ];

    const {
        items: rows,
        error: schemasError,
        isLoading: schemasIsLoading,
    } = useDatabaseSchemas(databaseRegistry?.id ?? '', databaseName);
    const error =
        registriesError ??
        (!registriesIsLoading && !databaseRegistry
            ? new Error(t('resources.databaseNotFound', { name: database }))
            : schemasError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="layers">
                    <div>
                        <HeroTitle>{t('resources.schemasTitle')}</HeroTitle>
                        <HeroDescription>
                            {t('resources.schemaDescription', {
                                database: databaseName,
                                name: databaseRegistry?.name || database,
                            })}
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={schemaColumns}
                data={rows}
                error={error}
                isLoading={registriesIsLoading || schemasIsLoading}
            />
        </div>
    );
}
