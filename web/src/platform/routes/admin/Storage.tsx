import { api } from '@/lib/api';
import { S3 } from '@/components/svg/S3';
import { useDeleteDialog } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zPageStorageRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { StorageRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the admin storage page. */
export default function AdminStorage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteStorage = useMutation({
        mutationFn: (storageId: string) => api(`/api/v1/storages/${storageId}`, { method: 'DELETE' }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/storages'] });
            toast({ body: 'Storage deleted' });
        },
    });
    const {
        items: storages,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/storages', zPageStorageRegistryResponse);
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

    if (isLoading && storages.length === 0) {
        return <PageLoading label="Loading storage registries" />;
    }

    if (error && storages.length === 0) {
        return <PageError description="We couldn't load the storage registries." title="Unable to load storage" />;
    }

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>Storage</Heading>
                    <Text type="supporting">Review Exoscale SOS integrations and object storage configuration.</Text>
                </VStack>
                <CreateStorage />
            </HStack>
            <Table
                data={storages}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<StorageRegistryResponse> field="storage" header="Storage" width={proportional(2)}>
                    {(storage) => (
                        <HStack gap={3} align="center">
                            <S3 />
                            <VStack gap={1}>
                                <Text weight="semibold">{storage.name}</Text>
                                <Text type="supporting">{storage.endpoint_url}</Text>
                            </VStack>
                        </HStack>
                    )}
                </TableColumn>
                <TableColumn<StorageRegistryResponse> align="end" field="actions" header="Action" width={pixel(96)}>
                    {(storage) => (
                        <MoreMenu
                            label={`Open actions for ${storage.name}`}
                            size="sm"
                            items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(storage) }]}
                        />
                    )}
                </TableColumn>
            </Table>
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
