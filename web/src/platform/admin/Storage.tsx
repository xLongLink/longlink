import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';
import { apiStorageRegistrySchema } from '@/lib/api-schemas';
import { platformApiPath } from '@/lib/platform-api';
import { storagesQueryKey } from '@/lib/query-keys';
import type { ApiStorageRegistry } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';
import { S3 } from '@/svg/S3';

/** Renders the admin storage page. */
export default function AdminStorage() {
    const t = useTranslator();
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteStorage = useMutation({
        mutationFn: (storageId: string) =>
            fetchApiVoid(platformApiPath(`/storages/${storageId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: storagesQueryKey });
            toast({ body: t('admin.storageDeleted') });
        },
    });
    const {
        items: storages,
        error,
        isLoading,
    } = useCollectionQuery<ApiStorageRegistry>(platformApiPath('/storages'), {
        parse: (value) => apiStorageRegistrySchema.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(storages);
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteStorageTitle'),
        mutation: deleteStorage,
        items: storages,
        getId: (storage) => storage.id,
        description: (storage) => t('admin.deleteStorageDescription', { name: storage.name }),
        errorMessage: t('admin.failedDeleteStorage'),
        fallbackDescription: t('admin.deleteStorageFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns: TableColumn<ApiStorageRegistry>[] = [
        {
            key: 'storage',
            header: t('admin.storageTitle'),
            width: proportional(2),
            renderCell: (storage) => (
                <HStack gap={3} align="center">
                    <S3 />
                    <VStack gap={1}>
                        <Text weight="semibold">{storage.name}</Text>
                        <Text type="supporting">{storage.endpoint_url}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'actions',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (storage) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: storage.name })}
                    size="sm"
                    items={[{ label: t('actions.delete'), onClick: () => deleteDialog.openFor(storage) }]}
                />
            ),
        },
    ];

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
                    columns={columns}
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
