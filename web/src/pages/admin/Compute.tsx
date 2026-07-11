import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { AdminActionMenu, AdminLocationBadge } from '@/components/admin/AdminTableElements';
import { DataTable } from '@/components/DataTable';
import ConnectCompute from '@/components/dialogs/ConnectCompute';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useLocations } from '@/data/admin';
import { useComputes } from '@/data/compute';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { computesQueryKey } from '@/lib/query-keys';
import type { ApiComputeRegistry, ApiLocation } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';

/** Returns localized admin compute table columns. */
function createComputeColumnsBase(t: TFunction): Array<ColumnDef<ApiComputeRegistry & { location?: ApiLocation }>> {
    return [
        {
            id: 'compute',
            header: t('admin.computeTitle'),
            cell: ({ row }) => {
                const gatewayUrl = row.original.gateway_url;
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
                                Kubernetes
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{gatewayUrl}</div>
                        </div>
                    </Link>
                );
            },
            meta: { className: 'min-w-56' },
        },
        {
            id: 'location',
            header: t('columns.location'),
            cell: ({ row }) => {
                return <AdminLocationBadge fallbackId={row.original.location_id} location={row.original.location} />;
            },
            meta: { className: 'min-w-56' },
        },
    ];
}

/** Renders the admin compute page. */
export default function AdminCompute() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';

    const deleteCompute = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(`/api/computes/${registryId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: computesQueryKey() });
            toast.success(t('admin.computeDeleted'));
        },
    });

    const { items: computes, error: computesError, isLoading: computesIsLoading } = useComputes();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();

    const locationById = new Map(locations.map((l) => [l.id, l]));
    const computeRows: Array<ApiComputeRegistry & { location?: ApiLocation }> = computes.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
    }));
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteComputeTitle'),
        mutation: deleteCompute,
        items: computeRows,
        getId: (compute) => compute.id,
        description: (compute) => t('admin.deleteComputeDescription', { slug: compute.slug }),
        errorMessage: t('admin.failedDeleteCompute'),
        fallbackDescription: t('admin.deleteComputeFallback'),
    });
    const computeColumnsBase = createComputeColumnsBase(t);

    const computeColumns = canManage
        ? ([
              ...computeColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const compute = row.original;
                      const computeSlug = compute.slug;

                      return (
                          <AdminActionMenu
                              label={`compute ${compute.gateway_url}`}
                              copyLabel={t('admin.copyComputeSlug')}
                              copyValue={computeSlug}
                              onDelete={() => deleteDialog.openFor(compute)}
                          />
                      );
                  },
              },
          ] satisfies Array<ColumnDef<ApiComputeRegistry & { location?: ApiLocation }>>)
        : computeColumnsBase;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="cpu">
                    <div>
                        <HeroTitle>{t('admin.computeTitle')}</HeroTitle>
                        <HeroDescription>{t('admin.computeDescription')}</HeroDescription>
                    </div>
                </Hero>
                {canManage ? <ConnectCompute /> : null}
            </div>
            <DataTable
                columns={computeColumns}
                data={computeRows}
                error={computesError ?? locationsError}
                isLoading={computesIsLoading || locationsIsLoading}
                pageSize={25}
            />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </div>
    );
}
