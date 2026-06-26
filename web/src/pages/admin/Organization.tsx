import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Building2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useOrganizations } from '@/hooks/use-organizations';
import { useUser } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { organizationsQueryKey } from '@/lib/query-keys';
import type { ApiOrganizationSummary } from '@/lib/types';

const organizationColumnsBase: Array<ColumnDef<ApiOrganizationSummary>> = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row, getValue }) => {
            const name = getValue<string>();

            return (
                <div className="flex items-center gap-3">
                    <Avatar shape="squircle" className="size-8">
                        <AvatarImage src={row.original.avatar ?? ''} alt={row.original.name} />
                        <AvatarFallback>{row.original.name.slice(0, 2).toUpperCase()}</AvatarFallback>
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
        header: 'Created by',
        cell: ({ row }) => {
            const createdBy = row.original.created_by;

            if (!createdBy) {
                return '—';
            }

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={createdBy.avatar} alt={createdBy.name} />
                        <AvatarFallback>{createdBy.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{createdBy.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {new Date(row.original.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'w-64' },
    },
    {
        id: 'updated_by',
        header: 'Updated by',
        cell: ({ row }) => {
            const updatedBy = row.original.updated_by;

            if (!updatedBy) {
                return '—';
            }

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={updatedBy.avatar} alt={updatedBy.name} />
                        <AvatarFallback>{updatedBy.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{updatedBy.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {new Date(row.original.updated_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'w-64' },
    },
    {
        id: 'deleted_by',
        header: 'Deleted by',
        cell: ({ row }) => {
            const deletedBy = row.original.deleted_by;

            if (!deletedBy) {
                return '—';
            }

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={deletedBy.avatar} alt={deletedBy.name} />
                        <AvatarFallback>{deletedBy.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{deletedBy.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {row.original.deleted_at ? new Date(row.original.deleted_at).toLocaleString() : '—'}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'w-64' },
    },
];

/** Renders the admin organizations page. */
export default function AdminOrganization() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteOrganization = useMutation({
        mutationFn: async (organizationId: string) => {
            await fetchApiVoid(`/api/organizations/${organizationId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey() });
            toast.success('Organization deleted');
        },
    });

    const { items: organizations, error, isLoading } = useOrganizations();
    const deleteTarget = organizations.find((organization) => organization.id === deleteTargetId) ?? null;
    const organizationColumns = canManage
        ? ([
              ...organizationColumnsBase,
              {
                  id: 'actions',
                  header: 'Action',
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const organization = row.original;

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
                                              aria-label={`Open actions for ${organization.name}`}
                                          />
                                      }
                                  >
                                      <MoreVertical className="size-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() => {
                                              void navigator.clipboard.writeText(organization.name);
                                              toast.success('Organization name copied');
                                          }}
                                      >
                                          Copy name
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          variant="destructive"
                                          onClick={() => {
                                              setDeleteTargetId(organization.id);
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
          ] satisfies Array<ColumnDef<ApiOrganizationSummary>>)
        : organizationColumnsBase;

    return (
        <div className="space-y-6">
            <Hero icon={<Building2 />}>
                <div>
                    <HeroTitle>Organizations</HeroTitle>
                    <HeroDescription>Review organization lifecycle, ownership, and access boundaries.</HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={organizationColumns}
                data={organizations}
                error={error}
                isLoading={isLoading}
            />
            <DeleteConfirmationDialog
                open={deleteTargetId !== null}
                title="Delete organization"
                description={deleteTarget ? `Delete organization ${deleteTarget.name}?` : 'Delete this organization?'}
                error={deleteError}
                isPending={deleteOrganization.isPending}
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
                        await deleteOrganization.mutateAsync(deleteTargetId);
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    } catch (mutationError) {
                        setDeleteError(
                            mutationError instanceof Error ? mutationError.message : 'Failed to delete organization'
                        );
                    }
                }}
            />
        </div>
    );
}
