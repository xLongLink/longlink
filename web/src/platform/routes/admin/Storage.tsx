import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StorageRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { api } from '@/lib/api';
import { S3 } from '@/components/svg/S3';
import { useDeleteDialog } from '@/lib/utils';
import { useToast } from '@/lib/hooks/use-toast';
import { usePaginate } from '@/lib/hooks/pagination';
import { Table, TableColumn } from '@/components/ui/Table';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { PageError, PageLoading } from '@/components/layouts/State';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zStorageRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin storage page. */
export default function AdminStorage() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteStorage = useMutation({
        mutationFn: async (storageId: string) => {
            await api(`/api/v1/storages/${storageId}`, { method: 'DELETE' });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/storages'] });
            toast({ body: 'Storage deleted' });
        },
    });
    const {
        data: storages = [],
        error,
        isLoading,
    } = useQuery({
        queryKey: ['api', '/api/v1/storages'],
        queryFn: async ({ signal }) =>
            zStorageRegistryResponse.array().parse(await api('/api/v1/storages', { signal }).json()),
    });
    const { pageItems, pagination } = usePaginate(storages);
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
                data={pageItems}
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
