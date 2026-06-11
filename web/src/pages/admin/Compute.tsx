import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Cpu, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectComputeDialog from '@/components/dialogs/ConnectComputeDialog';
import { apiUrl, fetchApiJson, fetchApiVoid } from '@/lib/api';
import type { ApiComputeRegistry, ApiLocation } from '@/lib/types';

const computeColumnsBase: Array<ColumnDef<ApiComputeRegistry & { location?: ApiLocation }>> = [
    {
        accessorKey: 'kind',
        header: 'Kind',
        cell: ({ row }) => {
            const kind = row.original.kind;
            const ingress = row.original.ingress_host;
            const computeId = String(row.original.id);

            return (
                <Link
                    to={`/admin/compute/${encodeURIComponent(computeId)}`}
                    className="flex items-center gap-3"
                >
                    <img
                        src="/images/Kubernetes.png"
                        alt="Kubernetes"
                        className="size-10 rounded-md border border-border bg-background object-contain p-1"
                    />
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground underline-offset-4 hover:underline">{kind}</div>
                        <div className="truncate text-xs text-muted-foreground">{ingress}</div>
                    </div>
                </Link>
            );
        },
        meta: { className: 'min-w-56' },
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
                        <div className="truncate font-medium text-foreground">{location?.name || `#${row.original.location_id}`}</div>
                        <div className="truncate text-xs text-muted-foreground">{location?.display_name || location?.country || ''}</div>
                    </div>
                </div>
            );
        },
        meta: { className: 'min-w-56' },
    },
];

/** Renders the admin compute page. */
export default function AdminCompute() {
    const queryClient = useQueryClient();
    const computeUrl = apiUrl('/api/compute');
    const locationsUrl = apiUrl('/api/locations');

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

    const locationsQuery = useQuery({
        queryKey: ['api', locationsUrl],
        queryFn: async () => fetchApiJson<Array<ApiLocation>>(locationsUrl, { credentials: 'include' }),
        retry: false,
    });

    const locationById = new Map(locationsQuery.data?.map((l) => [l.id, l]));
    const computeRows = (computeQuery.data ?? []).map((row) => ({ ...row, location: locationById.get(row.location_id) }));
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
    ] satisfies Array<ColumnDef<ApiComputeRegistry & { location?: ApiLocation }>>;

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
