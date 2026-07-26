import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { type TranslatorFn, useTranslator } from '@astryxdesign/core/i18n';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import CreateDatabase from '@/components/dialogs/CreateDatabase';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useDatabases } from '@/data/database';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { databasesQueryKey } from '@/lib/query-keys';
import type { ApiDatabaseRegistry } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';
import { PostgreSQL } from '@/svg/PostgreSQL';

/** Returns localized admin database table columns. */
function createDatabaseColumns(t: TranslatorFn): TableColumn<ApiDatabaseRegistry>[] {
    return [
        {
            key: 'database',
            header: t('columns.database'),
            width: proportional(1),
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
        mutationFn: async (databaseId: string) => {
            await fetchApiVoid(`/api/databases/${databaseId}`, { method: 'DELETE' });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: databasesQueryKey() });
            toast({ body: t('admin.databaseDeleted') });
        },
    });
    const { items: databases, error, isLoading } = useDatabases();
    const { pageItems, pagination } = useAdminPagination(databases);
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteDatabaseTitle'),
        mutation: deleteDatabase,
        items: databases,
        getId: (database) => database.id,
        description: (database) => t('admin.deleteDatabaseDescription', { slug: database.slug }),
        errorMessage: t('admin.failedDeleteDatabase'),
        fallbackDescription: t('admin.deleteDatabaseFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
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
                                  icon: <Copy size={16} />,
                                  onClick: async () => {
                                      try {
                                          await navigator.clipboard.writeText(database.slug);
                                          toast({ body: `${t('admin.copyDatabaseSlug')}: ${t('actions.copied')}` });
                                      } catch {
                                          toast({ body: t('toasts.copyFailed'), type: 'error' });
                                      }
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
