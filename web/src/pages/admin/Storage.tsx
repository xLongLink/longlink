import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import ConnectStorageDialog from '@/components/dialogs/ConnectStorageDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useLocations } from '@/hooks/use-locations';
import { useStorages } from '@/hooks/use-storages';
import { useUser } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { storagesQueryKey } from '@/lib/query-keys';
import type { ApiLocation, ApiStorageRegistry } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';

const storageColumnsBase: Array<ColumnDef<ApiStorageRegistry & { location?: ApiLocation }>> = [
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
];

/** Renders the admin storage page. */
export default function AdminStorage() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';

    const deleteStorage = useMutation({
        mutationFn: async (registryId: string) => {
            await fetchApiVoid(`/api/storages/${registryId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: storagesQueryKey() });
            toast.success('Storage deleted');
        },
    });

    const { items: storages, error: storageError, isLoading: storageIsLoading } = useStorages();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();
    const locationById = new Map(locations.map((location) => [location.id, location]));
    const storageRows: Array<ApiStorageRegistry & { location?: ApiLocation }> = storages.map((storage) => ({
        ...storage,
        location: locationById.get(storage.location_id),
    }));
    const deleteDialog = useDeleteDialog({
        title: 'Delete storage',
        mutation: deleteStorage,
        items: storageRows,
        getId: (storage) => storage.id,
        description: (storage) => `Delete storage ${storage.slug}?`,
        errorMessage: 'Failed to delete storage',
        fallbackDescription: 'Delete this storage registry?',
    });
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
                                              deleteDialog.openFor(storage);
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
                <Hero icon="hard-drive">
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
                error={storageError ?? locationsError}
                isLoading={storageIsLoading || locationsIsLoading}
            />
            <DeleteConfirmationDialog {...deleteDialog.dialogProps} />
        </div>
    );
}
