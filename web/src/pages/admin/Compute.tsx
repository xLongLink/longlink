import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiComputeRegistry } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { useComputes } from '@/data/compute';
import { useDeleteDialog } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user';
import { DataTable } from '@/components/DataTable';
import { apiQueryKey, fetchApiJson } from '@/lib/api';
import CreateCompute from '@/components/dialogs/CreateCompute';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { AdminActionMenu } from '@/components/admin/AdminTableElements';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { computesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';
import { apiComputeMutationResponseSchema, parseApiResponse } from '@/lib/api-schemas';

/** Returns localized admin compute table columns. */
function createComputeColumns(t: TFunction): Array<ColumnDef<ApiComputeRegistry>> {
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
                                {row.original.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{gatewayUrl ?? '—'}</div>
                        </div>
                    </Link>
                );
            },
            meta: { className: 'min-w-56' },
        },
        {
            accessorKey: 'status',
            header: t('columns.status'),
            meta: { className: 'w-32' },
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
        mutationFn: async (computeId: string) =>
            fetchApiJson(`/api/computes/${computeId}`, { method: 'DELETE' }, (value) =>
                parseApiResponse(apiComputeMutationResponseSchema, value)
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: computesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
                queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/operations') }),
            ]);
            toast.success(t('admin.computeDeleted'));
        },
    });
    const { items: computes, error, isLoading } = useComputes();
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteComputeTitle'),
        mutation: deleteCompute,
        items: computes,
        getId: (compute) => compute.id,
        description: (compute) => t('admin.deleteComputeDescription', { slug: compute.slug }),
        errorMessage: t('admin.failedDeleteCompute'),
        fallbackDescription: t('admin.deleteComputeFallback'),
    });
    const computeColumnsBase = createComputeColumns(t);
    const computeColumns = canManage
        ? ([
              ...computeColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => (
                      <AdminActionMenu
                          label={row.original.name}
                          copyLabel={t('admin.copyComputeSlug')}
                          copyValue={row.original.slug}
                          onDelete={() => deleteDialog.openFor(row.original)}
                      />
                  ),
              },
          ] satisfies Array<ColumnDef<ApiComputeRegistry>>)
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
                <CreateCompute />
            </div>
            <DataTable columns={computeColumns} data={computes} error={error} isLoading={isLoading} pageSize={25} />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </div>
    );
}
