import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { type ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { AdminActionMenu, AdminLocationBadge } from '@/components/admin/AdminTableElements';
import { DataTable } from '@/components/DataTable';
import ConnectDatabase from '@/components/dialogs/ConnectDatabase';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useLocations } from '@/data/admin';
import { useDatabases } from '@/data/database';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { databasesQueryKey } from '@/lib/query-keys';
import type { ApiDatabaseRegistry, ApiLocation } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';
import { PostgreSQL } from '@/svg/PostgreSQL';

/** Returns localized admin database table columns. */
function createDatabaseColumnsBase(
    t: TFunction
): Array<ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation }>> {
    return [
        {
            id: 'database',
            header: t('columns.database'),
            meta: { className: 'min-w-64' },
            cell: ({ row }) => {
                const database = row.original;
                const address = `${database.host}:${database.port}`;

                return (
                    <Link
                        to={`/admin/database/${encodeURIComponent(database.slug)}`}
                        className="flex items-center gap-3"
                    >
                        <PostgreSQL
                            aria-hidden={true}
                            className="size-10 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{database.username}</div>
                            <div className="truncate text-xs text-muted-foreground">{address}</div>
                        </div>
                    </Link>
                );
            },
        },
        {
            id: 'location',
            header: t('columns.location'),
            cell: ({ row }) => {
                return <AdminLocationBadge fallbackId={row.original.location_id} location={row.original.location} />;
            },
            meta: { className: 'min-w-56' },
        },
    ];
}

/** Renders the admin database page. */
export default function AdminDatabase() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';

    const deleteDatabase = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(`/api/databases/${registryId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: databasesQueryKey() });
            toast.success(t('admin.databaseDeleted'));
        },
    });

    const { items: databases, error: databasesError, isLoading: databasesIsLoading } = useDatabases();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();

    const locationById = new Map(locations.map((location) => [location.id, location]));
    const databaseTableRows: Array<ApiDatabaseRegistry & { location?: ApiLocation }> = databases.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
    }));
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteDatabaseTitle'),
        mutation: deleteDatabase,
        items: databaseTableRows,
        getId: (database) => database.id,
        description: (database) => t('admin.deleteDatabaseDescription', { slug: database.slug }),
        errorMessage: t('admin.failedDeleteDatabase'),
        fallbackDescription: t('admin.deleteDatabaseFallback'),
    });
    const databaseColumnsBase = createDatabaseColumnsBase(t);
    const databaseColumns = canManage
        ? ([
              ...databaseColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const database = row.original;

                      return (
                          <AdminActionMenu
                              label={database.name}
                              copyLabel={t('admin.copyDatabaseSlug')}
                              copyValue={database.slug}
                              onDelete={() => deleteDialog.openFor(database)}
                          />
                      );
                  },
              },
          ] satisfies Array<ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation }>>)
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
                {canManage ? <ConnectDatabase /> : null}
            </div>
            <DataTable
                columns={databaseColumns}
                data={databaseTableRows}
                error={databasesError ?? locationsError}
                isLoading={databasesIsLoading || locationsIsLoading}
                pageSize={25}
            />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </div>
    );
}
