import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { MapPin, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import CreateLocationDialog from '@/components/dialogs/CreateLocationDialog';
import { apiUrl, fetchApiJson, fetchApiVoid } from '@/lib/api';
import type { ApiLocation } from '@/lib/types';

const locationColumnsBase: Array<ColumnDef<ApiLocation>> = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => getValue(),
        meta: { className: 'w-48' },
    },
    {
        accessorKey: 'display_name',
        header: 'Display name',
        cell: ({ getValue }) => getValue(),
        meta: { className: 'w-64' },
    },
];

/** Renders the admin location page. */
export default function AdminLocation() {
    const queryClient = useQueryClient();
    const locationUrl = apiUrl('/api/locations');

    const deleteLocation = useMutation({
        mutationFn: async (locationId: string) => {
            await fetchApiVoid(apiUrl(`/api/locations/${encodeURIComponent(locationId)}`), {
                method: 'DELETE',
                credentials: 'include',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', locationUrl] });
            toast.success('Location deleted');
        },
    });

    const locationQuery = useQuery({
        queryKey: ['api', locationUrl],
        queryFn: async () => fetchApiJson<Array<ApiLocation>>(locationUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    const locationRows = locationQuery.data ?? [];
    const locationColumns = [
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
                                        aria-label={`Open actions for location ${location.name}`}
                                    />
                                }
                            >
                                <MoreHorizontal className="size-4" />
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
                                    onClick={async () => {
                                        if (!window.confirm(`Delete location ${location.name}?`)) {
                                            return;
                                        }

                                        try {
                                            await deleteLocation.mutateAsync(locationId);
                                        } catch (mutationError) {
                                            toast.error(
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : 'Failed to delete location'
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
    ] satisfies Array<ColumnDef<ApiLocation>>;

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
                <CreateLocationDialog />
            </div>
            {locationQuery.isLoading && locationRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading records...</div>
            ) : locationQuery.error && locationRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">{locationQuery.error.message}</div>
            ) : (
                <DataTable columns={locationColumns} data={locationRows} />
            )}
        </div>
    );
}
