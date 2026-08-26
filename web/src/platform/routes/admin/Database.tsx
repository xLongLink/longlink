import { api } from '@/lib/api';
import { useDeleteDialog } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { PostgreSQL } from '@/components/svg/PostgreSQL';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import CreateDatabase from '@/components/dialogs/CreateDatabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zPageDatabaseRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { DatabaseRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the admin database page. */
export default function AdminDatabase() {
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
        <VStack gap={6} width="100%">
            <HStack gap={0} justify="between" align="center" wrap="wrap">
                <VStack gap={0}>
                    <Heading level={1}>Database</Heading>
                    <Text type="supporting">Monitor platform data, schema health, and persistence state.</Text>
                </VStack>
                <CreateDatabase />
            </HStack>
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
                        <HStack gap={3} align="center">
                            <PostgreSQL height={24} width={24} />
                            <VStack>
                                <Text weight="semibold">{database.name}</Text>
                                <Text type="supporting">{`${database.host}:${database.port}`}</Text>
                            </VStack>
                        </HStack>
                    )}
                </TableColumn>
                <TableColumn<DatabaseRegistryResponse> align="end" field="actions" header="Action" width={pixel(96)}>
                    {(database) => (
                        <MoreMenu
                            label={`Open actions for ${database.name}`}
                            size="sm"
                            items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(database) }]}
                        />
                    )}
                </TableColumn>
            </Table>
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
