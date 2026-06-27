import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { MoreVertical } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectComputeDialog from '@/components/dialogs/ConnectComputeDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useComputes } from '@/hooks/use-computes';
import { useLocations } from '@/hooks/use-locations';
import { useUser } from '@/hooks/use-user';
import { fetchApiJson, fetchApiVoid } from '@/lib/api';
import { computeResourcesQueryKey, computesQueryKey } from '@/lib/query-keys';
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

const computeColumnsBase: Array<
    ColumnDef<ApiComputeRegistry & { location?: ApiLocation; resources?: ApiComputeResources }>
> = [
    {
        accessorKey: 'kind',
        header: 'Kind',
        cell: ({ row }) => {
            const kind = row.original.kind;
            const ingress = row.original.ingress_host;
            const computeSlug = row.original.slug;

            return (
                <Link to={`/admin/compute/${encodeURIComponent(computeSlug)}`} className="flex items-center gap-3">
                    <img
                        src="/images/Kubernetes.png"
                        alt="Kubernetes"
                        className="size-10 rounded-md border border-border bg-background object-contain p-1"
                    />
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground underline-offset-4 hover:underline">
                            {kind}
                        </div>
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
    const { role } = useUser();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteCompute = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(`/api/computes/${registryId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: computesQueryKey() });
            toast.success('Compute deleted');
        },
    });

    const { items: computes, error: computesError, isLoading: computesIsLoading } = useComputes();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();
    const resourcesQueries = useQueries({
        queries: computes.map((c) => ({
            queryKey: computeResourcesQueryKey(c.id),
            queryFn: async () => fetchApiJson<ApiComputeResources>(`/api/computes/${c.id}/resources`),
            retry: false,
        })),
    });

    const resourcesById = new Map<string, ApiComputeResources>();
    computes.forEach((c, i) => {
        const data = resourcesQueries[i]?.data;
        if (data) resourcesById.set(c.id, data);
    });

    const locationById = new Map(locations.map((l) => [l.id, l]));
    const computeRows = computes.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
        resources: resourcesById.get(row.id),
    }));
    const deleteTarget = computeRows.find((compute) => compute.id === deleteTargetId) ?? null;

    const computeColumns = canManage
        ? ([
              ...computeColumnsBase,
              {
                  id: 'actions',
                  header: 'Action',
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const compute = row.original;
                      const computeSlug = compute.slug;

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
                                              aria-label={`Open actions for compute ${compute.ingress_host}`}
                                          />
                                      }
                                  >
                                      <MoreVertical className="size-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() => {
                                              void navigator.clipboard.writeText(computeSlug);
                                              toast.success('Compute slug copied');
                                          }}
                                      >
                                          Copy slug
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          variant="destructive"
                                          onClick={() => {
                                              setDeleteTargetId(compute.id);
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
          ] satisfies Array<
              ColumnDef<ApiComputeRegistry & { location?: ApiLocation; resources?: ApiComputeResources }>
          >)
        : computeColumnsBase;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="cpu">
                    <div>
                        <HeroTitle>Compute</HeroTitle>
                        <HeroDescription>
                            Inspect runtime workloads, node capacity, and orchestration status.
                        </HeroDescription>
                    </div>
                </Hero>
                {canManage ? <ConnectComputeDialog /> : null}
            </div>
            <DataTable
                columns={computeColumns}
                data={computeRows}
                error={computesError ?? locationsError}
                isLoading={computesIsLoading || locationsIsLoading}
            />
            <DeleteConfirmationDialog
                open={deleteTargetId !== null}
                title="Delete compute"
                description={deleteTarget ? `Delete compute ${deleteTarget.slug}?` : 'Delete this compute registry?'}
                error={deleteError}
                isPending={deleteCompute.isPending}
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
                        await deleteCompute.mutateAsync(deleteTargetId);
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    } catch (mutationError) {
                        setDeleteError(mutationError instanceof Error ? mutationError.message : 'Failed to delete compute');
                    }
                }}
            />
        </div>
    );
}
