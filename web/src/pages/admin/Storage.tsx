import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiStorageRegistry } from '@/lib/types';
import { S3 } from '@/svg/S3';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useStorages } from '@/data/storage';
import { useDeleteDialog } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user';
import { DataTable } from '@/components/DataTable';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { AdminActionMenu } from '@/components/admin/AdminTableElements';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { apiStorageRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { infrastructureOptionsQueryKey, storagesQueryKey } from '@/lib/query-keys';

/** Returns localized admin storage table columns. */
function createStorageColumns(t: TFunction): Array<ColumnDef<ApiStorageRegistry>> {
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
            id: 'access_key',
            header: t('columns.accessKey'),
            cell: ({ row }) => {
                const storage = row.original;

                return (
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                            {storage.access_key_id ?? t('dialogs.none')}
                        </div>
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
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const deleteStorage = useMutation({
        mutationFn: async (storageId: string) =>
            fetchApiJson(`/api/storages/${storageId}`, { method: 'DELETE' }, (value) =>
                parseApiResponse(apiStorageRegistrySchema, value)
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: storagesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
            ]);
            toast.success(t('admin.storageDeleted'));
        },
    });
    const { items: storages, error, isLoading } = useStorages();
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteStorageTitle'),
        mutation: deleteStorage,
        items: storages,
        getId: (storage) => storage.id,
        description: (storage) => t('admin.deleteStorageDescription', { slug: storage.slug }),
        errorMessage: t('admin.failedDeleteStorage'),
        fallbackDescription: t('admin.deleteStorageFallback'),
    });
    const storageColumnsBase = createStorageColumns(t);
    const storageColumns = canManage
        ? ([
              ...storageColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => (
                      <AdminActionMenu
                          label={row.original.name}
                          copyLabel={t('admin.copyStorageSlug')}
                          copyValue={row.original.slug}
                          onDelete={() => deleteDialog.openFor(row.original)}
                      />
                  ),
              },
          ] satisfies Array<ColumnDef<ApiStorageRegistry>>)
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
                <CreateStorage />
            </div>
            <DataTable columns={storageColumns} data={storages} error={error} isLoading={isLoading} pageSize={25} />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </div>
    );
}
