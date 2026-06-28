import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { MoreVertical } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectDatabaseDialog from '@/components/dialogs/ConnectDatabaseDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useDatabases } from '@/hooks/use-databases';
import { useLocations } from '@/hooks/use-locations';
import { useUser } from '@/hooks/use-user';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { databaseUsageQueryKey, databasesQueryKey } from '@/lib/query-keys';
import type { ApiDatabaseRegistry, ApiDatabaseUsage, ApiLocation } from '@/lib/types';
import { formatBytes, useDeleteDialog } from '@/lib/utils';

const databaseColumnsBase: Array<
    ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation; usage?: ApiDatabaseUsage }>
> = [
    {
        id: 'database',
        header: 'Database',
        meta: { className: 'min-w-64' },
        cell: ({ row }) => {
            const database = row.original;

            return (
                <Link to={`/admin/database/${encodeURIComponent(database.slug)}`} className="flex items-center gap-3">
                    <img
                        src="/images/Postgresql.png"
                        alt="PostgreSQL"
                        className="size-10 rounded-md border border-border bg-background object-contain p-1"
                    />
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{database.username}</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {database.host}:{database.port}
                        </div>
                    </div>
                </Link>
            );
        },
    },
    {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => {
            const location = row.original.location;
            const country = location?.country;

            return (
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-xs font-semibold text-accent">
                        {country?.slice(0, 2).toUpperCase() || '--'}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                            {location?.name || `#${row.original.location_id}`}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                            {location?.slug || location?.country || ''}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'min-w-56' },
    },
    {
        id: 'usage',
        header: 'Usage',
        cell: ({ row }) => {
            const usage = row.original.usage;
            if (!usage) return <span className="text-muted-foreground">—</span>;

            return (
                <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{formatBytes(usage.space_used)}</div>
                    <div className="text-xs text-muted-foreground">Used</div>
                </div>
            );
        },
        meta: { className: 'w-48' },
    },
];

/** Renders the admin database page. */
export default function AdminDatabase() {
    const { role } = useUser();
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
            toast.success('Database deleted');
        },
    });

    const { items: databases, error: databasesError, isLoading: databasesIsLoading } = useDatabases();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();
    const usageQueries = useQueries({
        queries: databases.map((registry) => ({
            queryKey: databaseUsageQueryKey(registry.id),
            queryFn: async () => fetchApiJson<ApiDatabaseUsage>(`/api/databases/${registry.id}/usage`),
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
        title: 'Delete database',
        mutation: deleteDatabase,
        items: databaseTableRows,
        getId: (database) => database.id,
        description: (database) => `Delete database ${database.slug}?`,
        errorMessage: 'Failed to delete database',
        fallbackDescription: 'Delete this database?',
    });
    const databaseColumns = canManage
        ? ([
              ...databaseColumnsBase,
              {
                  id: 'actions',
                  header: 'Action',
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const database = row.original;

                      return (
                          <div className="flex justify-end">
                              <DropdownMenu>
                                  <DropdownMenuTrigger
                                      render={
                                          <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon-sm"
                                              className="cursor-pointer"
                                              aria-label={`Open actions for ${database.name}`}
                                          />
                                      }
                                  >
                                      <MoreVertical className="size-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() => {
                                              void navigator.clipboard.writeText(database.slug);
                                              toast.success('Database slug copied');
                                          }}
                                      >
                                          Copy slug
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          variant="destructive"
                                          onClick={() => {
                                              deleteDialog.openFor(database);
                                          }}
                                      >
                                          Delete
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
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
                        <HeroTitle>Database</HeroTitle>
                        <HeroDescription>
                            Monitor control-plane data, schema health, and persistence state.
                        </HeroDescription>
                    </div>
                </Hero>
                {canManage ? <ConnectDatabaseDialog /> : null}
            </div>
            <DataTable
                columns={databaseColumns}
                data={databaseTableRows}
                error={databasesError ?? locationsError}
                isLoading={databasesIsLoading || locationsIsLoading}
            />
            <DeleteConfirmationDialog {...deleteDialog.dialogProps} />
        </div>
    );
}
