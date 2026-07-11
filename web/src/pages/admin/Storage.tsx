import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { type ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { AdminActionMenu, AdminLocationBadge } from '@/components/admin/AdminTableElements';
import { DataTable } from '@/components/DataTable';
import ConnectStorage from '@/components/dialogs/ConnectStorage';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useLocations } from '@/data/admin';
import { useStorages } from '@/data/storage';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { storagesQueryKey } from '@/lib/query-keys';
import type { ApiLocation, ApiStorageRegistry } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';
import { S3 } from '@/svg/S3';

/** Returns localized admin storage table columns. */
function createStorageColumnsBase(t: TFunction): Array<ColumnDef<ApiStorageRegistry & { location?: ApiLocation }>> {
    return [
        {
            id: 'storage',
            header: t('admin.storageTitle'),
            cell: ({ row }) => {
                const storage = row.original;

                return (
                    <Link to={`/admin/storage/${encodeURIComponent(storage.slug)}`} className="flex items-center gap-3">
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
                    </Link>
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
                        <div className="truncate text-xs text-muted-foreground">{storage.protocol.toUpperCase()}</div>
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
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';

    const deleteStorage = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(`/api/storages/${registryId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: storagesQueryKey() });
            toast.success(t('admin.storageDeleted'));
        },
    });

    const { items: storages, error: storageError, isLoading: storageIsLoading } = useStorages();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();
    const locationById = new Map(locations.map((location) => [location.id, location]));
    const storageRows: Array<ApiStorageRegistry & { location?: ApiLocation }> = storages.map((storage) => ({
        ...storage,
        location: locationById.get(storage.location_id),
    }));
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteStorageTitle'),
        mutation: deleteStorage,
        items: storageRows,
        getId: (storage) => storage.id,
        description: (storage) => t('admin.deleteStorageDescription', { slug: storage.slug }),
        errorMessage: t('admin.failedDeleteStorage'),
        fallbackDescription: t('admin.deleteStorageFallback'),
    });
    const storageColumnsBase = createStorageColumnsBase(t);
    const storageColumns = canManage
        ? ([
              ...storageColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const storage = row.original;

                      return (
                          <AdminActionMenu
                              label={storage.name}
                              copyLabel={t('admin.copyStorageSlug')}
                              copyValue={storage.slug}
                              onDelete={() => deleteDialog.openFor(storage)}
                          />
                      );
                  },
              },
          ] satisfies Array<ColumnDef<ApiStorageRegistry & { location?: ApiLocation }>>)
        : storageColumnsBase;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="hard-drive">
                    <div>
                        <HeroTitle>{t('admin.storageTitle')}</HeroTitle>
                        <HeroDescription>{t('admin.storageDescription')}</HeroDescription>
                    </div>
                </Hero>
                {canManage ? <ConnectStorage /> : null}
            </div>
            <DataTable
                columns={storageColumns}
                data={storageRows}
                error={storageError ?? locationsError}
                isLoading={storageIsLoading || locationsIsLoading}
                pageSize={25}
            />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </div>
    );
}
