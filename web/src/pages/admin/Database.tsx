import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type TranslatorFn, useTranslator } from '@astryxdesign/core/i18n';
import {
    Table,
    type TableColumn,
    pixel,
    paginateData,
    proportional,
    useTablePagination,
} from '@astryxdesign/core/Table';
import type { ApiDatabaseRegistry } from '@/lib/types';
import { fetchApiJson } from '@/lib/api';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { useDeleteDialog } from '@/lib/utils';
import { useDatabases } from '@/data/database';
import { useUserProfile } from '@/hooks/use-user';
import CreateDatabase from '@/components/dialogs/CreateDatabase';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { apiDatabaseRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { databasesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';

/** Returns localized admin database table columns. */
function createDatabaseColumns(t: TranslatorFn): TableColumn<ApiDatabaseRegistry>[] {
    return [
        {
            key: 'database',
            header: t('columns.database'),
            width: proportional(1),
            renderCell: (database) => (
                <HStack gap={3} align="center">
                    <Icon icon={PostgreSQL} size="lg" />
                    <VStack gap={1}>
                        <Text weight="semibold">{database.name}</Text>
                        <Text type="supporting">{`${database.host}:${database.port}`}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'username',
            header: t('labels.username'),
            width: proportional(1),
            renderCell: (database) => database.username,
        },
        {
            key: 'sslmode',
            header: t('labels.sslMode'),
            width: pixel(128),
            renderCell: (database) => database.sslmode,
        },
    ];
}

/** Renders the admin database page. */
export default function AdminDatabase() {
    const t = useTranslator();
    const toast = useToast();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const deleteDatabase = useMutation({
        mutationFn: async (databaseId: string) =>
            fetchApiJson(`/api/databases/${databaseId}`, { method: 'DELETE' }, (value) =>
                parseApiResponse(apiDatabaseRegistrySchema, value)
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: databasesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
            ]);
            toast({ body: t('admin.databaseDeleted') });
        },
    });
    const { items: databases, error, isLoading } = useDatabases();
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const pageCount = Math.max(1, Math.ceil(databases.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pagination = useTablePagination<ApiDatabaseRegistry>({
        page: currentPage,
        onPageChange: setPage,
        totalItems: databases.length,
        pageSize,
        label: `${t('actions.previous')} / ${t('actions.next')}`,
        size: 'sm',
    });
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteDatabaseTitle'),
        mutation: deleteDatabase,
        items: databases,
        getId: (database) => database.id,
        description: (database) => t('admin.deleteDatabaseDescription', { slug: database.slug }),
        errorMessage: t('admin.failedDeleteDatabase'),
        fallbackDescription: t('admin.deleteDatabaseFallback'),
    });
    const columns = createDatabaseColumns(t);
    const databaseColumns: TableColumn<ApiDatabaseRegistry>[] = canManage
        ? [
              ...columns,
              {
                  key: 'actions',
                  header: t('columns.action'),
                  width: pixel(96),
                  align: 'end',
                  renderCell: (database) => (
                      <MoreMenu
                          label={t('common.openActionsFor', { name: database.name })}
                          size="sm"
                          items={[
                              {
                                  label: `${t('actions.copy')} ${t('admin.copyDatabaseSlug').toLowerCase()}`,
                                  icon: <Icon icon="copy" size="sm" />,
                                  onClick: () => {
                                      void navigator.clipboard.writeText(database.slug);
                                      toast({ body: `${t('admin.copyDatabaseSlug')}: ${t('actions.copied')}` });
                                  },
                              },
                              { label: t('actions.delete'), onClick: () => deleteDialog.openFor(database) },
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
                    <Heading level={1}>{t('admin.databaseTitle')}</Heading>
                    <Text type="supporting">{t('admin.databaseDescription')}</Text>
                </VStack>
                <CreateDatabase />
            </HStack>
            {isLoading && databases.length === 0 ? null : error && databases.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={databaseColumns}
                    data={paginateData(databases, currentPage, pageSize)}
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
