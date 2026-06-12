import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Database, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectDatabaseDialog from '@/components/dialogs/ConnectDatabaseDialog';
import { useUser } from '@/hooks/use-user';
import { apiUrl, fetchApiJson, fetchApiVoid } from '@/lib/api';
import type { ApiDatabaseRegistry, ApiLocation } from '@/lib/types';

const databaseColumnsBase: Array<ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation }>> = [
    {
        id: 'database',
        header: 'Database',
        meta: { className: 'min-w-64' },
        cell: ({ row }) => {
            const database = row.original;

            return (
                <Link
                    to={`/admin/database/${encodeURIComponent(database.name)}`}
                    className="flex items-center gap-3"
                >
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
                        <div className="truncate text-xs text-muted-foreground">{location?.slug || location?.country || ''}</div>
                    </div>
                </div>
            );
        },
        meta: { className: 'min-w-56' },
    },
];

/** Renders the admin database page. */
export default function AdminDatabase() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const databaseUrl = apiUrl('/api/database');
    const locationsUrl = apiUrl('/api/locations');
    const canManage = role === 'administrator';

    const deleteDatabase = useMutation({
        mutationFn: async (name: string) => {
            await fetchApiVoid(apiUrl(`/api/database/${encodeURIComponent(name)}`), {
                method: 'DELETE',
                credentials: 'include',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', databaseUrl] });
            toast.success('Database deleted');
        },
    });

    const databaseQuery = useQuery({
        queryKey: ['api', databaseUrl],
        queryFn: async () => fetchApiJson<Array<ApiDatabaseRegistry>>(databaseUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    const locationsQuery = useQuery({
        queryKey: ['api', locationsUrl],
        queryFn: async () => fetchApiJson<Array<ApiLocation>>(locationsUrl, { credentials: 'include' }),
        retry: false,
    });

    const databaseRows = databaseQuery.data ?? [];
    const locationById = new Map(locationsQuery.data?.map((location) => [location.id, location]));
    const databaseTableRows = databaseRows.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
    }));
    const databaseColumns = canManage
        ? [
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
                                              aria-label={`Open actions for ${database.name}`}
                                          />
                                      }
                                  >
                                      <MoreHorizontal className="size-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() => {
                                              void navigator.clipboard.writeText(database.name);
                                              toast.success('Database name copied');
                                          }}
                                      >
                                          Copy name
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          variant="destructive"
                                          onClick={async () => {
                                              // Confirm the destructive action before deleting the database registry.
                                              if (!window.confirm(`Delete database ${database.name}?`)) {
                                                  return;
                                              }

                                              try {
                                                  await deleteDatabase.mutateAsync(database.name);
                                              } catch (mutationError) {
                                                  toast.error(
                                                      mutationError instanceof Error
                                                          ? mutationError.message
                                                          : 'Failed to delete database'
                                                  );
                                              }
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
          ] satisfies Array<ColumnDef<ApiDatabaseRegistry & { location?: ApiLocation }>>
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
        </div>
    );
}
