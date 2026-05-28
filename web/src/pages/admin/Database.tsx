import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Database, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectDatabaseDialog from '@/components/dialogs/ConnectDatabaseDialog';
import { apiUrl } from '@/lib/api';
import type { ApiDatabaseRegistry, ApiResponse } from '@/lib/types';

const databaseColumnsBase: Array<ColumnDef<ApiDatabaseRegistry>> = [
    {
        id: 'database',
        header: 'Database',
        meta: { className: 'min-w-64' },
        cell: ({ row }) => {
            const database = row.original;

            return (
                <div className="flex items-center gap-3">
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
                </div>
            );
        },
    },
    {
        accessorKey: 'sslmode',
        header: 'SSL',
        cell: ({ getValue }) => getValue() ?? 'default',
        meta: { className: 'w-32' },
    },
    {
        header: 'Maintenance DB',
        cell: ({ row }) => row.original.maintenance_database,
        meta: { className: 'w-44' },
    },
];

/** Renders the admin database page. */
export default function AdminDatabase() {
    const queryClient = useQueryClient();
    const databaseUrl = apiUrl('/api/database');

    const deleteDatabase = useMutation({
        mutationFn: async (name: string) => {
            const response = await fetch(apiUrl(`/api/database/${encodeURIComponent(name)}`), {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return null;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', databaseUrl] });
            toast.success('Database deleted');
        },
    });

    const databaseQuery = useQuery({
        queryKey: ['api', databaseUrl],
        queryFn: async () => {
            const response = await fetch(databaseUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as ApiResponse<Array<ApiDatabaseRegistry>>;

            return payload.data ?? [];
        },
        retry: false,
    });

    const databaseRows = databaseQuery.data ?? [];
    const databaseColumns = [
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
    ] satisfies Array<ColumnDef<ApiDatabaseRegistry>>;

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
                <ConnectDatabaseDialog />
            </div>
            {databaseQuery.isLoading && databaseRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading records...</div>
            ) : databaseQuery.error && databaseRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">{databaseQuery.error.message}</div>
            ) : (
                <DataTable columns={databaseColumns} data={databaseRows} />
            )}
        </div>
    );
}
