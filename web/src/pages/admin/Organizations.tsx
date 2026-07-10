import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { useTranslation } from '@/lib/i18n';
import { type ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { AdminActionMenu } from '@/components/admin/AdminTableElements';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useOrganizations } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { organizationsQueryKey } from '@/lib/query-keys';
import type { ApiOrganizationSummary } from '@/lib/types';
import { formatDateTime, getInitials, useDeleteDialog } from '@/lib/utils';

/** Returns localized admin organization table columns. */
function createOrganizationColumnsBase(t: TFunction): Array<ColumnDef<ApiOrganizationSummary>> {
    return [
        {
            accessorKey: 'name',
            header: t('columns.name'),
            cell: ({ row, getValue }) => {
                const name = getValue<string>();

                return (
                    <div className="flex items-center gap-3">
                        <Avatar shape="squircle" className="size-8">
                            <AvatarImage src={row.original.avatar ?? ''} alt={row.original.name} />
                            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
                        </Avatar>
                        <Link to={`/orgs/${row.original.slug}`} className="font-medium text-foreground hover:underline">
                            {name}
                        </Link>
                    </div>
                );
            },
        },
        {
            id: 'created_by',
            header: t('columns.createdBy'),
            cell: ({ row }) => {
                const createdBy = row.original.created_by;

                // Show an empty value when creator data is unavailable.
                if (!createdBy) {
                    return '—';
                }

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={createdBy.avatar} alt={createdBy.name} />
                            <AvatarFallback>{getInitials(createdBy.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{createdBy.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                                {formatDateTime(row.original.created_at)}
                            </div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'w-64' },
        },
        {
            id: 'updated_by',
            header: t('columns.updatedBy'),
            cell: ({ row }) => {
                const updatedBy = row.original.updated_by;

                // Show an empty value when updater data is unavailable.
                if (!updatedBy) {
                    return '—';
                }

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={updatedBy.avatar} alt={updatedBy.name} />
                            <AvatarFallback>{getInitials(updatedBy.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{updatedBy.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                                {formatDateTime(row.original.updated_at)}
                            </div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'w-64' },
        },
        {
            id: 'deleted_by',
            header: t('columns.deletedBy'),
            cell: ({ row }) => {
                const deletedBy = row.original.deleted_by;

                // Show an empty value when deletion metadata is unavailable.
                if (!deletedBy) {
                    return '—';
                }

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={deletedBy.avatar} alt={deletedBy.name} />
                            <AvatarFallback>{getInitials(deletedBy.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{deletedBy.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                                {row.original.deleted_at ? formatDateTime(row.original.deleted_at) : '—'}
                            </div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'w-64' },
        },
    ];
}

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';

    const deleteOrganization = useMutation({
        mutationFn: async (organizationId: string) => {
            await fetchApiVoid(`/api/organizations/${organizationId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey() });
            toast.success(t('admin.organizationDeleted'));
        },
    });

    const { items: organizations, error, isLoading } = useOrganizations();
    const deleteDialog = useDeleteDialog({
        title: t('deleteDialog.deleteOrganizationTitle'),
        mutation: deleteOrganization,
        items: organizations,
        getId: (organization) => organization.id,
        description: (organization) => t('admin.deleteOrganizationDescription', { name: organization.name }),
        errorMessage: t('deleteDialog.failedDeleteOrganization'),
        fallbackDescription: t('deleteDialog.deleteOrganizationFallback'),
    });
    const organizationColumnsBase = createOrganizationColumnsBase(t);
    const organizationColumns = canManage
        ? ([
              ...organizationColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const organization = row.original;

                      return (
                          <AdminActionMenu
                              label={organization.name}
                              copyLabel={t('admin.organizationName')}
                              copyValue={organization.name}
                              onDelete={() => deleteDialog.openFor(organization)}
                          />
                      );
                  },
              },
          ] satisfies Array<ColumnDef<ApiOrganizationSummary>>)
        : organizationColumnsBase;

    return (
        <div className="space-y-6">
            <Hero icon="building-2">
                <div>
                    <HeroTitle>{t('admin.organizationsTitle')}</HeroTitle>
                    <HeroDescription>{t('admin.organizationsDescription')}</HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={organizationColumns}
                data={organizations}
                error={error}
                isLoading={isLoading}
                pageSize={25}
            />
            <DeleteConfirmationDialog {...deleteDialog.dialogProps} />
        </div>
    );
}
