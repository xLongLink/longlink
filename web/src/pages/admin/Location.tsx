import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { toast } from 'sonner';

import { AdminActionMenu, AdminLocationBadge } from '@/components/admin/AdminTableElements';
import { DataTable } from '@/components/DataTable';
import CreateLocationDialog from '@/components/dialogs/CreateLocationDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useLocations } from '@/hooks/use-locations';
import { useUser } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { locationsQueryKey } from '@/lib/query-keys';
import type { ApiLocation } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';

const locationColumnsBase: Array<ColumnDef<ApiLocation>> = [
    {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => {
            return <AdminLocationBadge location={row.original} />;
        },
        meta: { className: 'min-w-56' },
    },
];

/** Renders the admin location page. */
export default function AdminLocation() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';

    const deleteLocation = useMutation({
        mutationFn: async (locationId: string) => {
            await fetchApiVoid(`/api/locations/${locationId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: locationsQueryKey() });
            toast.success('Location deleted');
        },
    });

    const { items: locationRows, error, isLoading } = useLocations();
    const deleteDialog = useDeleteDialog({
        title: 'Delete location',
        mutation: deleteLocation,
        items: locationRows,
        getId: (location) => String(location.id),
        description: (location) => `Delete ${location.name}?`,
        errorMessage: 'Failed to delete location',
        fallbackDescription: 'Delete this location?',
    });
    const locationColumns = canManage
        ? ([
              ...locationColumnsBase,
              {
                  id: 'actions',
                  header: 'Action',
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const location = row.original;
                      const locationId = String(location.id);

                      return (
                          <AdminActionMenu
                              label={`location ${location.name}`}
                              copyLabel="Location ID"
                              copyValue={locationId}
                              onDelete={() => deleteDialog.openFor(location)}
                          />
                      );
                  },
              },
          ] satisfies Array<ColumnDef<ApiLocation>>)
        : locationColumnsBase;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="map-pin">
                    <div>
                        <HeroTitle>Locations</HeroTitle>
                        <HeroDescription>
                            Manage datacenter and cloud region locations for infrastructure deployments.
                        </HeroDescription>
                    </div>
                </Hero>
                {canManage ? <CreateLocationDialog /> : null}
            </div>
            <DataTable columns={locationColumns} data={locationRows} error={error} isLoading={isLoading} />
            <DeleteConfirmationDialog {...deleteDialog.dialogProps} />
        </div>
    );
}
