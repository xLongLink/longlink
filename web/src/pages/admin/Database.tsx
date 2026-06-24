import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Database, MoreVertical } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectDatabaseDialog from '@/components/dialogs/ConnectDatabaseDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useApiQuery } from '@/hooks/use-api';
import { useUser } from '@/hooks/use-user';
import { apiQueryKey, fetchApiJson, fetchApiVoid } from '@/lib/api';
import type { ApiDatabaseRegistry, ApiDatabaseUsage, ApiLocation } from '@/lib/types';

/** Format one byte count for the admin usage table. */
function formatBytes(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${Math.round(value)} ${units[unit]}`;
}

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
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteDatabase = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(`/api/databases/${registryId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/databases') });
            toast.success('Database deleted');
        },
    });

    const databaseQuery = useApiQuery<Array<ApiDatabaseRegistry>>('/api/databases', {
        retry: false,
        refetchOnMount: 'always',
    });

    const locationsQuery = useApiQuery<Array<ApiLocation>>('/api/locations', {
        retry: false,
    });

    const databaseRows = databaseQuery.data ?? [];
    const deleteTarget = databaseRows.find((database) => database.id === deleteTargetId) ?? null;
    const usageQueries = useQueries({
        queries: databaseRows.map((registry) => ({
            queryKey: apiQueryKey(`/api/databases/${registry.id}/usage`),
            queryFn: async () => fetchApiJson<ApiDatabaseUsage>(`/api/databases/${registry.id}/usage`),
            retry: false,
        })),
    });

    const usageById = new Map<string, ApiDatabaseUsage>();
    databaseRows.forEach((registry, index) => {
        const data = usageQueries[index]?.data;
        if (data) usageById.set(registry.id, data);
    });

    const locationById = new Map(locationsQuery.data?.map((location) => [location.id, location]));
    const databaseTableRows = databaseRows.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
        usage: usageById.get(row.id),
    }));
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
                                              setDeleteTargetId(database.id);
                                              setDeleteError(null);
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
                <Hero icon={<Database />}>
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
                error={databaseQuery.error}
                isLoading={databaseQuery.isLoading}
            />
            <DeleteConfirmationDialog
                open={deleteTargetId !== null}
                title="Delete database"
                description={deleteTarget ? `Delete database ${deleteTarget.slug}?` : 'Delete this database?'}
                error={deleteError}
                isPending={deleteDatabase.isPending}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    }
                }}
                onConfirm={async () => {
                    if (deleteTargetId === null) {
                        return;
                    }

                    try {
                        await deleteDatabase.mutateAsync(deleteTargetId);
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    } catch (mutationError) {
                        setDeleteError(mutationError instanceof Error ? mutationError.message : 'Failed to delete database');
                    }
                }}
            />
        </div>
    );
}
