import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiDatabaseRegistry } from '@/lib/types';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { useDeleteDialog } from '@/lib/utils';
import { useDatabases } from '@/data/database';
import { useUserProfile } from '@/hooks/use-user';
import { DataTable } from '@/components/DataTable';
import CreateDatabase from '@/components/dialogs/CreateDatabase';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { AdminActionMenu } from '@/components/admin/AdminTableElements';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { apiDatabaseRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { databasesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';

/** Returns localized admin database table columns. */
function createDatabaseColumns(t: TFunction): Array<ColumnDef<ApiDatabaseRegistry>> {
    return [
        {
            id: 'database',
            header: t('columns.database'),
            meta: { className: 'min-w-64' },
            cell: ({ row }) => {
                const database = row.original;
                const address = `${database.host}:${database.port}`;

                return (
                    <div className="flex items-center gap-3">
                        <PostgreSQL
                            aria-hidden={true}
                            className="size-10 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{database.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{address}</div>
                        </div>
                    </div>
                );
            },
        },
        { accessorKey: 'username', header: t('labels.username'), meta: { className: 'min-w-40' } },
    ];
}

/** Renders the admin database page. */
export default function AdminDatabase() {
    const { t } = useTranslation();
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
            toast.success(t('admin.databaseDeleted'));
        },
    });
    const { items: databases, error, isLoading } = useDatabases();
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteDatabaseTitle'),
        mutation: deleteDatabase,
        items: databases,
        getId: (database) => database.id,
        description: (database) => t('admin.deleteDatabaseDescription', { slug: database.slug }),
        errorMessage: t('admin.failedDeleteDatabase'),
        fallbackDescription: t('admin.deleteDatabaseFallback'),
    });
    const databaseColumnsBase = createDatabaseColumns(t);
    const databaseColumns = canManage
        ? ([
              ...databaseColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => (
                      <AdminActionMenu
                          label={row.original.name}
                          copyLabel={t('admin.copyDatabaseSlug')}
                          copyValue={row.original.slug}
                          onDelete={() => deleteDialog.openFor(row.original)}
                      />
                  ),
              },
          ] satisfies Array<ColumnDef<ApiDatabaseRegistry>>)
        : databaseColumnsBase;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="database">
                    <div>
                        <HeroTitle>{t('admin.databaseTitle')}</HeroTitle>
                        <HeroDescription>{t('admin.databaseDescription')}</HeroDescription>
                    </div>
                </Hero>
                <CreateDatabase />
            </div>
            <DataTable columns={databaseColumns} data={databases} error={error} isLoading={isLoading} pageSize={25} />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </div>
    );
}
