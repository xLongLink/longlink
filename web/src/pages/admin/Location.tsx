import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { MapPin, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import CreateLocationDialog from '@/components/dialogs/CreateLocationDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useLocations } from '@/hooks/use-locations';
import { useUser } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { locationsQueryKey } from '@/lib/query-keys';
import type { ApiLocation } from '@/lib/types';

const locationColumnsBase: Array<ColumnDef<ApiLocation>> = [
    {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => {
            const country = row.original.country;
            return (
                <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-xs font-semibold text-accent">
                        {country?.slice(0, 2).toUpperCase() || '--'}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{row.original.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{row.original.slug}</div>
                    </div>
                </div>
            );
        },
        meta: { className: 'min-w-56' },
    },
];

/** Renders the admin location page. */
export default function AdminLocation() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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
    const deleteTarget = locationRows.find((location) => String(location.id) === deleteTargetId) ?? null;
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
                          <div className="flex justify-end">
                              <DropdownMenu>
                                  <DropdownMenuTrigger
                                      render={
                                          <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon-sm"
                                              className="cursor-pointer"
                                              aria-label={`Open actions for location ${location.name}`}
                                          />
                                      }
                                  >
                                      <MoreVertical className="size-4" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() => {
                                              void navigator.clipboard.writeText(locationId);
                                              toast.success('Location ID copied');
                                          }}
                                      >
                                          Copy ID
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                          className="cursor-pointer"
                                          variant="destructive"
                                          onClick={() => {
                                              setDeleteTargetId(locationId);
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
          ] satisfies Array<ColumnDef<ApiLocation>>)
        : locationColumnsBase;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<MapPin />}>
                    <div>
                        <HeroTitle>Locations</HeroTitle>
                        <HeroDescription>
                            Manage datacenter and cloud region locations for infrastructure deployments.
                        </HeroDescription>
                    </div>
                </Hero>
                {canManage ? <CreateLocationDialog /> : null}
            </div>
            <DataTable
                columns={locationColumns}
                data={locationRows}
                error={error}
                isLoading={isLoading}
            />
            <DeleteConfirmationDialog
                open={deleteTargetId !== null}
                title="Delete location"
                description={deleteTarget ? `Delete ${deleteTarget.name}?` : 'Delete this location?'}
                error={deleteError}
                isPending={deleteLocation.isPending}
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
                        await deleteLocation.mutateAsync(deleteTargetId);
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    } catch (mutationError) {
                        setDeleteError(mutationError instanceof Error ? mutationError.message : 'Failed to delete location');
                    }
                }}
            />
        </div>
    );
}
