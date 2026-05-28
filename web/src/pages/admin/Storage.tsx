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
import { HardDrive, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectStorageDialog from '@/components/dialogs/ConnectStorageDialog';
import { apiUrl } from '@/lib/api';
import type { ApiResponse, ApiStorageRegistry } from '@/lib/types';

const storageColumnsBase: Array<ColumnDef<ApiStorageRegistry>> = [
    { accessorKey: 'kind', header: 'Kind', cell: ({ getValue }) => getValue(), meta: { className: 'w-32' } },
    { accessorKey: 'protocol', header: 'Protocol', cell: ({ getValue }) => getValue(), meta: { className: 'w-32' } },
    {
        accessorKey: 'endpoint_url',
        header: 'Endpoint',
        cell: ({ getValue }) => getValue(),
        meta: { className: 'w-72' },
    },
    {
        accessorKey: 'access_key_id',
        header: 'Access key',
        cell: ({ getValue }) => getValue(),
        meta: { className: 'w-64' },
    },
];

/** Renders the admin storage page. */
export default function AdminStorage() {
    const queryClient = useQueryClient();
    const storageUrl = apiUrl('/api/storage');

    const deleteStorage = useMutation({
        mutationFn: async (name: string) => {
            const response = await fetch(apiUrl(`/api/storage/${encodeURIComponent(name)}`), {
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
            await queryClient.invalidateQueries({ queryKey: ['api', storageUrl] });
            toast.success('Storage deleted');
        },
    });

    const storageQuery = useQuery({
        queryKey: ['api', storageUrl],
        queryFn: async () => {
            const response = await fetch(storageUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as ApiResponse<Array<ApiStorageRegistry>>;

            return payload.data ?? [];
        },
        retry: false,
    });

    const storageRows = storageQuery.data ?? [];
    const storageColumns = [
        ...storageColumnsBase,
        {
            id: 'actions',
            header: 'Action',
            meta: { className: 'w-24 text-right' },
            cell: ({ row }) => {
                const storage = row.original;

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Open actions for ${storage.name}`}
                                    />
                                }
                            >
                                <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        void navigator.clipboard.writeText(storage.name);
                                        toast.success('Storage name copied');
                                    }}
                                >
                                    Copy name
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    variant="destructive"
                                    onClick={async () => {
                                        // Confirm the destructive action before deleting the storage registry.
                                        if (!window.confirm(`Delete storage ${storage.name}?`)) {
                                            return;
                                        }

                                        try {
                                            await deleteStorage.mutateAsync(storage.name);
                                        } catch (mutationError) {
                                            toast.error(
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : 'Failed to delete storage'
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
    ] satisfies Array<ColumnDef<ApiStorageRegistry>>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<HardDrive />}>
                    <div>
                        <HeroTitle>Storage</HeroTitle>
                        <HeroDescription>
                            Review file storage integrations and object storage configuration.
                        </HeroDescription>
                    </div>
                </Hero>
                <ConnectStorageDialog />
            </div>
            {storageQuery.isLoading && storageRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading records...</div>
            ) : storageQuery.error && storageRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">{storageQuery.error.message}</div>
            ) : (
                <DataTable columns={storageColumns} data={storageRows} />
            )}
        </div>
    );
}
