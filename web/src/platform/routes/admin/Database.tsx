import { api } from '@/lib/api';
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Stack } from '@/components/ui/Stack';
import { useDeleteDialog } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@astryxdesign/core/Button';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { PostgreSQL } from '@/components/svg/PostgreSQL';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import CreateDatabase from '@/components/dialogs/CreateDatabase';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageDatabaseRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { DatabaseRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the admin database page. */
export default function AdminDatabase() {
    const [metadataDatabase, setMetadataDatabase] = useState<DatabaseRegistryResponse | null>(null);
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteDatabase = useMutation({
        mutationFn: (databaseId: string) => api(`/api/v1/databases/${databaseId}`, { method: 'DELETE' }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/databases'] });
            toast({ body: 'Database deleted' });
        },
    });
    const {
        items: databases,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/databases', zPageDatabaseRegistryResponse);
    const deleteDialog = useDeleteDialog({
        title: 'Delete database',
        mutation: deleteDatabase,
        items: databases,
        getId: (database) => database.id,
        description: (database) => `Delete database ${database.name}?`,
        errorMessage: 'Failed to delete database',
        fallbackDescription: 'Delete this database?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });

    if (isLoading && databases.length === 0) {
        return <PageLoading label="Loading databases" />;
    }

    if (error && databases.length === 0) {
        return <PageError description="We couldn't load the database registries." title="Unable to load databases" />;
    }

    return (
        <Stack gap={6} width="100%">
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Stack>
                    <Heading level={1}>Database</Heading>
                    <Text as="p" color="secondary">
                        Monitor platform data, schema health, and persistence state.
                    </Text>
                </Stack>
                <CreateDatabase />
            </Stack>
            <Table
                data={databases}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<DatabaseRegistryResponse> field="database" header="Database" width={proportional(2)}>
                    {(database) => (
                        <Stack direction="horizontal" gap={3} align="center">
                            <PostgreSQL height={24} width={24} />
                            <Stack>
                                <Text weight="semibold">{database.name}</Text>
                                <Text type="supporting">{`${database.host}:${database.port}`}</Text>
                            </Stack>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<DatabaseRegistryResponse> align="end" field="metadata" header="" width={pixel(56)}>
                    {(database) => (
                        <IconButton
                            icon={<Ellipsis />}
                            label={`View metadata for ${database.name}`}
                            size="sm"
                            tooltip="View metadata"
                            variant="ghost"
                            onClick={() => setMetadataDatabase(database)}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataDatabase ? (
                <Dialog
                    isOpen
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setMetadataDatabase(null);
                        }
                    }}
                    purpose="info"
                    width={560}
                >
                    <Layout
                        header={
                            <DialogHeader
                                title="Database metadata"
                                subtitle={metadataDatabase.name}
                                onOpenChange={() => setMetadataDatabase(null)}
                            />
                        }
                        content={
                            <LayoutContent>
                                <MetadataList>
                                    <MetadataListItem label="Host">{metadataDatabase.host}</MetadataListItem>
                                    <MetadataListItem label="Port">{metadataDatabase.port}</MetadataListItem>
                                    <MetadataListItem label="SSL mode">{metadataDatabase.sslmode}</MetadataListItem>
                                    <MetadataListItem label="Username">{metadataDatabase.username}</MetadataListItem>
                                    <MetadataListItem label="ID">{metadataDatabase.id}</MetadataListItem>
                                </MetadataList>
                            </LayoutContent>
                        }
                        footer={
                            <LayoutFooter>
                                <Button
                                    label="Delete"
                                    variant="destructive"
                                    onClick={() => {
                                        const database = metadataDatabase;
                                        setMetadataDatabase(null);
                                        deleteDialog.openFor(database);
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
