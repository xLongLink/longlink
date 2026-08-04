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
import CreateDatabase from '@/components/dialogs/CreateDatabase';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';
import { zDatabaseRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { databasesQueryKey } from '@/lib/query-keys';
import type { ApiDatabaseRegistry } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';
import { PostgreSQL } from '@/svg/PostgreSQL';

/** Renders the admin database page. */
export default function AdminDatabase() {
    const t = useTranslator();
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteDatabase = useMutation({
        mutationFn: (databaseId: string) =>
            fetchApiVoid(platformApiPath(`/databases/${databaseId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: databasesQueryKey });
            toast({ body: t('admin.databaseDeleted') });
        },
    });
    const {
        items: databases,
        error,
        isLoading,
    } = useCollectionQuery<ApiDatabaseRegistry>(platformApiPath('/databases'), {
        parse: (value) => zDatabaseRegistryResponse.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(databases);
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteDatabaseTitle'),
        mutation: deleteDatabase,
        items: databases,
        getId: (database) => database.id,
        description: (database) => t('admin.deleteDatabaseDescription', { name: database.name }),
        errorMessage: t('admin.failedDeleteDatabase'),
        fallbackDescription: t('admin.deleteDatabaseFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns: TableColumn<ApiDatabaseRegistry>[] = [
        {
            key: 'database',
            header: t('columns.database'),
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
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (database) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: database.name })}
                    size="sm"
                    items={[{ label: t('actions.delete'), onClick: () => deleteDialog.openFor(database) }]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>{t('admin.databaseTitle')}</Heading>
                    <Text type="supporting">{t('admin.databaseDescription')}</Text>
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
