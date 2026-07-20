import type { TFunction } from 'i18next';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiStorageRegistry } from '@/lib/types';
import { S3 } from '@/svg/S3';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useStorages } from '@/data/storage';
import { useDeleteDialog } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { apiStorageRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { infrastructureOptionsQueryKey, storagesQueryKey } from '@/lib/query-keys';

/** Returns localized admin storage table columns. */
function createStorageColumns(t: TFunction): DataTableColumn<ApiStorageRegistry>[] {
    return [
        {
            key: 'storage',
            header: t('admin.storageTitle'),
            width: proportional(2),
            renderCell: (storage) => (
                <HStack gap={3} align="center">
                    <Icon icon={S3} size="lg" />
                    <VStack gap={1}>
                        <Text weight="semibold">{storage.name}</Text>
                        <Text type="supporting">{storage.endpoint_url}</Text>
                        {storage.runtime_endpoint_url !== storage.endpoint_url ? (
                            <Text type="supporting">
                                {t('common.runtime')}: {storage.runtime_endpoint_url}
                            </Text>
                        ) : null}
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'access_key',
            header: t('columns.accessKey'),
            width: proportional(1),
            renderCell: (storage) => (
                <VStack gap={1}>
                    <Text weight="semibold">{storage.access_key_id ?? t('dialogs.none')}</Text>
                    <Text type="supporting">{storage.kind.toUpperCase()}</Text>
                </VStack>
            ),
        },
    ];
}

/** Renders the admin storage page. */
export default function AdminStorage() {
    const { t } = useTranslation();
    const toast = useToast();
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
            toast({ body: t('admin.storageDeleted') });
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
    const columns = createStorageColumns(t);
    const storageColumns: DataTableColumn<ApiStorageRegistry>[] = canManage
        ? [
              ...columns,
              {
                  key: 'actions',
                  header: t('columns.action'),
                  width: pixel(96),
                  align: 'end',
                  renderCell: (storage) => (
                      <MoreMenu
                          label={t('common.openActionsFor', { name: storage.name })}
                          size="sm"
                          items={[
                              {
                                  label: `${t('actions.copy')} ${t('admin.copyStorageSlug').toLowerCase()}`,
                                  icon: <Icon icon="copy" size="sm" />,
                                  onClick: () => {
                                      void navigator.clipboard.writeText(storage.slug);
                                      toast({ body: `${t('admin.copyStorageSlug')}: ${t('actions.copied')}` });
                                  },
                              },
                              { label: t('actions.delete'), onClick: () => deleteDialog.openFor(storage) },
                          ]}
                      />
                  ),
              },
          ]
        : columns;

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>{t('admin.storageTitle')}</Heading>
                    <Text type="supporting">{t('admin.storageDescription')}</Text>
                </VStack>
                <CreateStorage />
            </HStack>
            <DataTable columns={storageColumns} data={storages} error={error} isLoading={isLoading} pageSize={25} />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
