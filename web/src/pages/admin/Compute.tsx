import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
import type { ApiComputeRegistry, ApiComputeResources, ApiLocation } from '@/lib/types';

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

const computeColumnsBase: Array<ColumnDef<ApiComputeRegistry & { location?: ApiLocation; resources?: ApiComputeResources }>> = [
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
                        <div className="truncate text-xs text-muted-foreground">{location?.slug || location?.country || ''}</div>
                    </div>
                </div>
            );
        },
        meta: { className: 'min-w-56' },
    },
    {
        id: 'resources',
        header: 'Resources',
        cell: ({ row }) => {
            const r = row.original.resources;
            if (!r) return <span className="text-muted-foreground">—</span>;
            const ramPct = Math.round((r.ram_free / r.ram_total) * 100);
            const cpuPct = Math.round((r.cpu_free / r.cpu_total) * 100);
            return (
                <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <div className="truncate font-medium text-foreground">{formatBytes(r.ram_total)}</div>
                        <div className="shrink-0 text-xs text-muted-foreground">({ramPct}% Free)</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="truncate font-medium text-foreground">{r.cpu_total} vCPU</div>
                        <div className="shrink-0 text-xs text-muted-foreground">({cpuPct}% Free)</div>
                    </div>
                </div>
            );
        },
        meta: { className: 'w-48' },
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

    const computeList = computeQuery.data ?? [];
    const resourcesQueries = useQueries({
        queries: computeList.map((c) => ({
            queryKey: ['api', apiUrl(`/api/compute/${c.id}/resources`)],
            queryFn: async () =>
                fetchApiJson<ApiComputeResources>(apiUrl(`/api/compute/${c.id}/resources`), {
                    credentials: 'include',
                }),
            retry: false,
        })),
    });

    const resourcesById = new Map<number, ApiComputeResources>();
    computeList.forEach((c, i) => {
        const data = resourcesQueries[i]?.data;
        if (data) resourcesById.set(c.id, data);
    });

    const locationById = new Map(locationsQuery.data?.map((l) => [l.id, l]));
    const computeRows = computeList.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
        resources: resourcesById.get(row.id),
    }));

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
    ] satisfies Array<ColumnDef<ApiComputeRegistry & { location?: ApiLocation; resources?: ApiComputeResources }>>;

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
