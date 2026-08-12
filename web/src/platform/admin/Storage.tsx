import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { StorageRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { S3 } from '@/svg/S3';
import { fetchApiVoid } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useDeleteDialog } from '@/lib/utils';
import { storagesQueryKey } from '@/lib/query-keys';
import { platformApiPath } from '@/lib/platform-api';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { useAdminPagination } from '@/platform/admin/pagination';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zStorageRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin storage page. */
export default function AdminStorage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteStorage = useMutation({
        mutationFn: (storageId: string) =>
            fetchApiVoid(platformApiPath(`/storages/${storageId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: storagesQueryKey });
            toast({ body: 'Storage deleted' });
        },
    });
    const {
        items: storages,
        error,
        isLoading,
    } = useCollectionQuery<StorageRegistryResponse>(platformApiPath('/storages'), {
        parse: (value) => zStorageRegistryResponse.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(storages);
    const deleteDialog = useDeleteDialog({
        title: 'Delete storage',
        mutation: deleteStorage,
        items: storages,
        getId: (storage) => storage.id,
        description: (storage) => `Delete storage ${storage.name}?`,
        errorMessage: 'Failed to delete storage',
        fallbackDescription: 'Delete this storage registry?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns: TableColumn<StorageRegistryResponse>[] = [
        {
            key: 'storage',
            header: 'Storage',
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
            header: 'Action',
            width: pixel(96),
            align: 'end',
            renderCell: (storage) => (
                <MoreMenu
                    label={`Open actions for ${storage.name}`}
                    size="sm"
                    items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(storage) }]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>Storage</Heading>
                    <Text type="supporting">Review Exoscale SOS integrations and object storage configuration.</Text>
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
                    emptyState={<EmptyState title="No results." isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
