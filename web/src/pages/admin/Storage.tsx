import type { TFunction } from 'i18next';
import { type ColumnDef } from '@tanstack/react-table';
import type { ApiLocation, ApiStorageRegistry } from '@/lib/types';
import { S3 } from '@/svg/S3';
import { useLocations } from '@/data/admin';
import { useTranslation } from '@/lib/i18n';
import { useStorages } from '@/data/storage';
import { DataTable } from '@/components/DataTable';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { AdminLocationBadge } from '@/components/admin/AdminTableElements';

/** Returns localized admin storage table columns. */
function createStorageColumns(t: TFunction): Array<ColumnDef<ApiStorageRegistry & { location?: ApiLocation }>> {
    return [
        {
            id: 'storage',
            header: t('admin.storageTitle'),
            cell: ({ row }) => {
                const storage = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <S3
                            aria-hidden={true}
                            className="size-10 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{storage.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{storage.endpoint_url}</div>
                            {storage.runtime_endpoint_url !== storage.endpoint_url ? (
                                <div className="truncate text-xs text-muted-foreground">
                                    {t('common.runtime')}: {storage.runtime_endpoint_url}
                                </div>
                            ) : null}
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-64' },
        },
        {
            id: 'location',
            header: t('columns.location'),
            cell: ({ row }) => {
                return <AdminLocationBadge fallbackId={row.original.location_id} location={row.original.location} />;
            },
            meta: { className: 'min-w-56' },
        },
        {
            id: 'access_key',
            header: t('columns.accessKey'),
            cell: ({ row }) => {
                const storage = row.original;

                return (
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{storage.access_key_id}</div>
                        <div className="truncate text-xs text-muted-foreground">{storage.kind.toUpperCase()}</div>
                    </div>
                );
            },
            meta: { className: 'w-48' },
        },
    ];
}

/** Renders the admin storage page. */
export default function AdminStorage() {
    const { t } = useTranslation();
    const { items: storages, error: storageError, isLoading: storageIsLoading } = useStorages();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();
    const locationById = new Map(locations.map((location) => [location.id, location]));
    const storageRows: Array<ApiStorageRegistry & { location?: ApiLocation }> = storages.map((storage) => ({
        ...storage,
        location: locationById.get(storage.location_id),
    }));
    const storageColumns = createStorageColumns(t);

    return (
        <div className="space-y-6">
            <Hero icon="hard-drive">
                <div>
                    <HeroTitle>{t('admin.storageTitle')}</HeroTitle>
                    <HeroDescription>{t('admin.storageDescription')}</HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={storageColumns}
                data={storageRows}
                error={storageError ?? locationsError}
                isLoading={storageIsLoading || locationsIsLoading}
                pageSize={25}
            />
        </div>
    );
}
