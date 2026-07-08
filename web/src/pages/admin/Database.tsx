import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { type ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { AdminActionMenu, AdminLocationBadge } from '@/components/admin/AdminTableElements';
import { DataTable } from '@/components/DataTable';
import ConnectDatabaseDialog from '@/components/dialogs/ConnectDatabaseDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useLocations } from '@/data/admin';
import { useDatabases } from '@/data/database';
import { useUserProfile } from '@/hooks/use-user';
import { apiDatabaseUsageSchema, parseApiResponse } from '@/lib/api-schemas';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { databaseUsageQueryKey, databasesQueryKey } from '@/lib/query-keys';
import type { ApiDatabaseRegistry, ApiDatabaseUsage, ApiLocation } from '@/lib/types';
import { formatBytes, useDeleteDialog } from '@/lib/utils';
import { PostgreSQL } from '@/svg/PostgreSQL';

/** Returns localized admin database table columns. */
function createDatabaseColumnsBase(
    t: TFunction
): Array<ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation; usage?: ApiDatabaseUsage }>> {
    return [
        {
            id: 'database',
            header: t('columns.database'),
            meta: { className: 'min-w-64' },
            cell: ({ row }) => {
                const database = row.original;
                const managementAddress = `${database.host}:${database.port}`;
                const runtimeAddress = `${database.runtime_host}:${database.runtime_port}`;

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
                            <div className="truncate text-xs text-muted-foreground">{managementAddress}</div>
                            {runtimeAddress !== managementAddress ? (
                                <div className="truncate text-xs text-muted-foreground">
                                    {t('common.runtime')} {runtimeAddress}
                                </div>
                            ) : null}
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
        {
            id: 'usage',
            header: t('columns.usage'),
            cell: ({ row }) => {
                const usage = row.original.usage;
                if (!usage) return <span className="text-muted-foreground">—</span>;

                return (
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{formatBytes(usage.space_used)}</div>
                        <div className="text-xs text-muted-foreground">{t('common.used')}</div>
                    </div>
                );
            },
            meta: { className: 'w-48' },
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
    const usageQueries = useQueries({
        queries: databases.map((registry) => ({
            queryKey: databaseUsageQueryKey(registry.id),
            queryFn: async () =>
                fetchApiJson(`/api/databases/${registry.id}/usage`, undefined, (value) =>
                    parseApiResponse(apiDatabaseUsageSchema, value)
                ),
            retry: false,
        })),
    });

    const usageById = new Map<string, ApiDatabaseUsage>();
    databases.forEach((registry, index) => {
        const data = usageQueries[index]?.data;
        if (data) usageById.set(registry.id, data);
    });

    const locationById = new Map(locations.map((location) => [location.id, location]));
    const databaseTableRows: Array<ApiDatabaseRegistry & { location?: ApiLocation; usage?: ApiDatabaseUsage }> =
        databases.map((row) => ({
            ...row,
            location: locationById.get(row.location_id),
            usage: usageById.get(row.id),
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
          ] satisfies Array<ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation; usage?: ApiDatabaseUsage }>>)
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
                {canManage ? <ConnectDatabaseDialog /> : null}
            </div>
            <DataTable
                columns={databaseColumns}
                data={databaseTableRows}
                error={databasesError ?? locationsError}
                isLoading={databasesIsLoading || locationsIsLoading}
                pageSize={25}
            />
            <DeleteConfirmationDialog {...deleteDialog.dialogProps} />
        </div>
    );
}
