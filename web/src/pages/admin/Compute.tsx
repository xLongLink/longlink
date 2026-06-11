import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Cpu, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectComputeDialog from '@/components/dialogs/ConnectComputeDialog';
import { apiUrl, fetchApiJson, fetchApiVoid } from '@/lib/api';
import type { ApiComputeRegistry } from '@/lib/types';

const computeColumnsBase: Array<ColumnDef<ApiComputeRegistry>> = [
    {
        accessorKey: 'kind',
        header: 'Kind',
        cell: ({ row }) => {
            const kind = row.original.kind;

            return (
                <div className="flex items-center gap-3">
                    <img
                        src="/images/Kubernetes.png"
                        alt="Kubernetes"
                        className="size-10 rounded-md border border-border bg-background object-contain p-1"
                    />
                    <div className="truncate font-medium text-foreground">{kind}</div>
                </div>
            );
        },
        meta: { className: 'w-40' },
    },
    {
        accessorKey: 'ingress_host',
        header: 'Ingress host',
        cell: ({ getValue }) => getValue(),
        meta: { className: 'w-48' },
    },
    {
        accessorKey: 'location_id',
        header: 'Location',
        cell: ({ getValue }) => `#${getValue<number>()}`,
        meta: { className: 'w-28' },
    },
];

/** Renders the admin compute page. */
export default function AdminCompute() {
    const queryClient = useQueryClient();
    const computeUrl = apiUrl('/api/compute');

    const deleteCompute = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(apiUrl(`/api/compute/${encodeURIComponent(registryId)}`), {
                method: 'DELETE',
                credentials: 'include',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', computeUrl] });
            toast.success('Compute deleted');
        },
    });

    const computeQuery = useQuery({
        queryKey: ['api', computeUrl],
        queryFn: async () => fetchApiJson<Array<ApiComputeRegistry>>(computeUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    const computeRows = computeQuery.data ?? [];
    const computeColumns = [
        ...computeColumnsBase,
        {
            id: 'actions',
            header: 'Action',
            meta: { className: 'w-24 text-right' },
            cell: ({ row }) => {
                const compute = row.original;
                const computeId = String(compute.id);

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Open actions for compute ${compute.id}`}
                                    />
                                }
                            >
                                <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        void navigator.clipboard.writeText(computeId);
                                        toast.success('Compute ID copied');
                                    }}
                                >
                                    Copy ID
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    variant="destructive"
                                    onClick={async () => {
                                        // Confirm the destructive action before deleting the compute registry.
                                        if (!window.confirm(`Delete compute ${compute.id}?`)) {
                                            return;
                                        }

                                        try {
                                            await deleteCompute.mutateAsync(computeId);
                                        } catch (mutationError) {
                                            toast.error(
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : 'Failed to delete compute'
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
    ] satisfies Array<ColumnDef<ApiComputeRegistry>>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Cpu />}>
                    <div>
                        <HeroTitle>Compute</HeroTitle>
                        <HeroDescription>
                            Inspect runtime workloads, node capacity, and orchestration status.
                        </HeroDescription>
                    </div>
                </Hero>
                <ConnectComputeDialog />
            </div>
            <DataTable
                columns={computeColumns}
                data={computeRows}
                error={computeQuery.error}
                isLoading={computeQuery.isLoading}
            />
        </div>
    );
}
