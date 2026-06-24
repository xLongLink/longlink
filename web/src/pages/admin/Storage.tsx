import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { HardDrive, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectStorageDialog from '@/components/dialogs/ConnectStorageDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useApiQuery } from '@/hooks/use-api';
import { useUser } from '@/hooks/use-user';
import { apiQueryKey, fetchApiVoid } from '@/lib/api';
import type { ApiStorageRegistry } from '@/lib/types';

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
    {
        accessorKey: 'location_id',
        header: 'Location',
        cell: ({ getValue }) => `#${getValue<number>()}`,
        meta: { className: 'w-28' },
    },
];

/** Renders the admin storage page. */
export default function AdminStorage() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteStorage = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(`/api/storages/${registryId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/storages') });
            toast.success('Storage deleted');
        },
    });

    const storageQuery = useApiQuery<Array<ApiStorageRegistry>>('/api/storages', {
        retry: false,
        refetchOnMount: 'always',
    });

    const storageRows = storageQuery.data ?? [];
    const deleteTarget = storageRows.find((storage) => storage.id === deleteTargetId) ?? null;
    const storageColumns = canManage
        ? ([
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
                                              className="cursor-pointer"
                                              aria-label={`Open actions for ${storage.name}`}
                                          />
                                      }
                                  >
                                      <MoreVertical className="size-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() => {
                                              void navigator.clipboard.writeText(storage.slug);
                                              toast.success('Storage slug copied');
                                          }}
                                      >
                                          Copy slug
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          variant="destructive"
                                          onClick={() => {
                                              setDeleteTargetId(storage.id);
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
          ] satisfies Array<ColumnDef<ApiStorageRegistry>>)
        : storageColumnsBase;

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
                {canManage ? <ConnectStorageDialog /> : null}
            </div>
            <DataTable
                columns={storageColumns}
                data={storageRows}
                error={storageQuery.error}
                isLoading={storageQuery.isLoading}
            />
            <DeleteConfirmationDialog
                open={deleteTargetId !== null}
                title="Delete storage"
                description={deleteTarget ? `Delete storage ${deleteTarget.slug}?` : 'Delete this storage registry?'}
                error={deleteError}
                isPending={deleteStorage.isPending}
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
                        await deleteStorage.mutateAsync(deleteTargetId);
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    } catch (mutationError) {
                        setDeleteError(mutationError instanceof Error ? mutationError.message : 'Failed to delete storage');
                    }
                }}
            />
        </div>
    );
}
