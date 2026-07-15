import type { TFunction } from 'i18next';
import { type ColumnDef } from '@tanstack/react-table';
import type { ApiDatabaseRegistry, ApiLocation } from '@/lib/types';
import { useLocations } from '@/data/admin';
import { useTranslation } from '@/lib/i18n';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { useDatabases } from '@/data/database';
import { DataTable } from '@/components/DataTable';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { AdminLocationBadge } from '@/components/admin/AdminTableElements';

/** Returns localized admin database table columns. */
function createDatabaseColumns(t: TFunction): Array<ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation }>> {
    return [
        {
            id: 'database',
            header: t('columns.database'),
            meta: { className: 'min-w-64' },
            cell: ({ row }) => {
                const database = row.original;
                const address = `${database.host}:${database.port}`;

                return (
                    <div className="flex items-center gap-3">
                        <PostgreSQL
                            aria-hidden={true}
                            className="size-10 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{database.username}</div>
                            <div className="truncate text-xs text-muted-foreground">{address}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'location',
            header: t('columns.location'),
            cell: ({ row }) => {
                return <AdminLocationBadge fallbackId={row.original.location_id} location={row.original.location} />;
            },
            meta: { className: 'min-w-56' },
        },
    ];
}

/** Renders the admin database page. */
export default function AdminDatabase() {
    const { t } = useTranslation();
    const { items: databases, error: databasesError, isLoading: databasesIsLoading } = useDatabases();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();

    const locationById = new Map(locations.map((location) => [location.id, location]));
    const databaseTableRows: Array<ApiDatabaseRegistry & { location?: ApiLocation }> = databases.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
    }));
    const databaseColumns = createDatabaseColumns(t);

    return (
        <div className="space-y-6">
            <Hero icon="database">
                <div>
                    <HeroTitle>{t('admin.databaseTitle')}</HeroTitle>
                    <HeroDescription>{t('admin.databaseDescription')}</HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={databaseColumns}
                data={databaseTableRows}
                error={databasesError ?? locationsError}
                isLoading={databasesIsLoading || locationsIsLoading}
                pageSize={25}
            />
        </div>
    );
}
