import { api } from '@/lib/api';
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { S3 } from '@/components/svg/S3';
import { Stack } from '@/components/ui/Stack';
import { useDeleteDialog } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@astryxdesign/core/Button';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import CreateStorage from '@/components/dialogs/CreateStorage';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageStorageRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { StorageRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the admin storage page. */
export default function AdminStorage() {
    const [metadataStorage, setMetadataStorage] = useState<StorageRegistryResponse | null>(null);
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
        <Stack gap={6} width="100%">
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Stack>
                    <Heading level={1}>Storage</Heading>
                    <Text as="p" color="secondary">
                        Review Exoscale SOS integrations and object storage configuration.
                    </Text>
                </Stack>
                <CreateStorage />
            </Stack>
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
                        <Stack direction="horizontal" gap={3} align="center">
                            <S3 />
                            <Stack>
                                <Text weight="semibold">{storage.name}</Text>
                                <Text type="supporting">{storage.endpoint_url}</Text>
                            </Stack>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<StorageRegistryResponse> align="end" field="metadata" header="" width={pixel(56)}>
                    {(storage) => (
                        <IconButton
                            icon={<Ellipsis />}
                            label={`View metadata for ${storage.name}`}
                            size="sm"
                            tooltip="View metadata"
                            variant="ghost"
                            onClick={() => setMetadataStorage(storage)}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataStorage ? (
                <Dialog
                    isOpen
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setMetadataStorage(null);
                        }
                    }}
                    purpose="info"
                    width={560}
                >
                    <Layout
                        header={
                            <DialogHeader
                                title="Storage metadata"
                                subtitle={metadataStorage.name}
                                onOpenChange={() => setMetadataStorage(null)}
                            />
                        }
                        content={
                            <LayoutContent>
                                <MetadataList>
                                    <MetadataListItem label="Endpoint">{metadataStorage.endpoint_url}</MetadataListItem>
                                    <MetadataListItem label="ID">{metadataStorage.id}</MetadataListItem>
                                </MetadataList>
                            </LayoutContent>
                        }
                        footer={
                            <LayoutFooter>
                                <Button
                                    label="Delete"
                                    variant="destructive"
                                    onClick={() => {
                                        const storage = metadataStorage;
                                        setMetadataStorage(null);
                                        deleteDialog.openFor(storage);
                                    }}
                                />
                            </LayoutFooter>
                        }
                    />
                </Dialog>
            ) : null}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </Stack>
    );
}
