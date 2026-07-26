import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { type TranslatorFn, useTranslator } from '@astryxdesign/core/i18n';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useStorages } from '@/data/storage';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { storagesQueryKey } from '@/lib/query-keys';
import type { ApiStorageRegistry } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';
import { S3 } from '@/svg/S3';

/** Returns localized admin storage table columns. */
function createStorageColumns(t: TranslatorFn): TableColumn<ApiStorageRegistry>[] {
    return [
        {
            key: 'storage',
            header: t('admin.storageTitle'),
            width: proportional(2),
            renderCell: (storage) => (
                <HStack gap={3} align="center">
                    <S3 height={24} width={24} />
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
    ];
}

/** Renders the admin storage page. */
export default function AdminStorage() {
    const t = useTranslator();
    const toast = useToast();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const deleteStorage = useMutation({
        mutationFn: async (storageId: string) => {
            await fetchApiVoid(`/api/storages/${storageId}`, { method: 'DELETE' });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: storagesQueryKey() });
            toast({ body: t('admin.storageDeleted') });
        },
    });
    const { items: storages, error, isLoading } = useStorages();
    const { pageItems, pagination } = useAdminPagination(storages);
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteStorageTitle'),
        mutation: deleteStorage,
        items: storages,
        getId: (storage) => storage.id,
        description: (storage) => t('admin.deleteStorageDescription', { slug: storage.slug }),
        errorMessage: t('admin.failedDeleteStorage'),
        fallbackDescription: t('admin.deleteStorageFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns = createStorageColumns(t);
    const storageColumns: TableColumn<ApiStorageRegistry>[] = canManage
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
                                  icon: <Copy size={16} />,
                                  onClick: async () => {
                                      try {
                                          await navigator.clipboard.writeText(storage.slug);
                                          toast({ body: `${t('admin.copyStorageSlug')}: ${t('actions.copied')}` });
                                      } catch {
                                          toast({ body: t('toasts.copyFailed'), type: 'error' });
                                      }
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
            {isLoading && storages.length === 0 ? null : error && storages.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={storageColumns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
