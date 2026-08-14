import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { DatabaseRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { fetchApiVoid } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useApiQuery } from '@/hooks/use-api';
import { useDeleteDialog } from '@/lib/utils';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { usePaginate } from '@/hooks/pagination';
import { platformApiPath } from '@/lib/platform-api';
import { databasesQueryKey } from '@/lib/query-keys';
import CreateDatabase from '@/components/dialogs/CreateDatabase';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zDatabaseRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin database page. */
export default function AdminDatabase() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteDatabase = useMutation({
        mutationFn: (databaseId: string) =>
            fetchApiVoid(platformApiPath(`/databases/${databaseId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: databasesQueryKey });
            toast({ body: 'Database deleted' });
        },
    });
    const {
        data: databases = [],
        error,
        isLoading,
    } = useApiQuery<DatabaseRegistryResponse[]>(platformApiPath('/databases'), {
        parse: (value) => zDatabaseRegistryResponse.array().parse(value),
    });
    const { pageItems, pagination } = usePaginate(databases);
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
    const columns: TableColumn<DatabaseRegistryResponse>[] = [
        {
            key: 'database',
            header: 'Database',
            width: proportional(2),
            renderCell: (database) => (
                <HStack gap={3} align="center">
                    <PostgreSQL height={24} width={24} />
                    <VStack gap={1}>
                        <Text weight="semibold">{database.name}</Text>
                        <Text type="supporting">{`${database.host}:${database.port}`}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'actions',
            header: 'Action',
            width: pixel(96),
            align: 'end',
            renderCell: (database) => (
                <MoreMenu
                    label={`Open actions for ${database.name}`}
                    size="sm"
                    items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(database) }]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>Database</Heading>
                    <Text type="supporting">Monitor platform data, schema health, and persistence state.</Text>
                </VStack>
                <CreateDatabase />
            </HStack>
            {isLoading && databases.length === 0 ? null : error && databases.length === 0 ? (
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
