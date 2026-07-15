import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiLocation } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { useLocations } from '@/data/admin';
import { Badge } from '@/components/ui/badge';
import { useDeleteDialog } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user';
import { DataTable } from '@/components/DataTable';
import { apiQueryKey, fetchApiJson } from '@/lib/api';
import CreateLocation from '@/components/dialogs/CreateLocation';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { apiLocationMutationResponseSchema, parseApiResponse } from '@/lib/api-schemas';
import { AdminActionMenu, AdminLocationBadge } from '@/components/admin/AdminTableElements';
import { computesQueryKey, databasesQueryKey, locationsQueryKey, storagesQueryKey } from '@/lib/query-keys';

/** Returns localized admin location table columns. */
function createLocationColumnsBase(t: TFunction): Array<ColumnDef<ApiLocation>> {
    return [
        {
            id: 'location',
            header: t('columns.location'),
            cell: ({ row }) => {
                return <AdminLocationBadge location={row.original} />;
            },
            meta: { className: 'min-w-56' },
        },
        {
            accessorKey: 'status',
            header: t('columns.status'),
            cell: ({ row }) => {
                const location = row.original;

                return (
                    <Badge variant={location.status === 'failed' ? 'destructive' : 'outline'}>{location.status}</Badge>
                );
            },
            meta: { className: 'w-36' },
        },
        {
            id: 'metadata',
            header: t('columns.metadata'),
            cell: ({ row }) => {
                const location = row.original;

                return <div className="text-xs text-muted-foreground">Platform {location.version ?? 'Pending'}</div>;
            },
            meta: { className: 'min-w-56' },
        },
    ];
}

/** Renders the admin location page. */
export default function AdminLocation() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';

    const deleteLocation = useMutation({
        mutationFn: async (locationId: string) => {
            return fetchApiJson(
                `/api/locations/${locationId}`,
                {
                    method: 'DELETE',
                },
                (value) => parseApiResponse(apiLocationMutationResponseSchema, value)
            );
        },
        onSuccess: async () => {
            // Refresh every diagnostic owned by the location aggregate.
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: locationsQueryKey() }),
                queryClient.invalidateQueries({ queryKey: computesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: databasesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: storagesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/operations') }),
            ]);
            toast.success(t('admin.locationDeleted'));
        },
    });

    const { items: locationRows, error, isLoading } = useLocations();
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteLocationTitle'),
        mutation: deleteLocation,
        items: locationRows,
        getId: (location) => String(location.id),
        description: (location) => t('admin.deleteLocationDescription', { name: location.name }),
        errorMessage: t('admin.failedDeleteLocation'),
        fallbackDescription: t('admin.deleteLocationFallback'),
    });
    const locationColumnsBase = createLocationColumnsBase(t);
    const locationColumns = canManage
        ? ([
              ...locationColumnsBase,
              {
                  id: 'actions',
                  header: t('columns.action'),
                  meta: { className: 'w-24 text-right' },
                  cell: ({ row }) => {
                      const location = row.original;
                      const locationId = String(location.id);

                      return (
                          <AdminActionMenu
                              label={t('admin.locationLabel', { name: location.name })}
                              copyLabel={t('admin.locationId')}
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
                        <HeroTitle>{t('admin.locationsTitle')}</HeroTitle>
                        <HeroDescription>{t('admin.locationsDescription')}</HeroDescription>
                    </div>
                </Hero>
                {canManage ? <CreateLocation /> : null}
            </div>
            <DataTable
                columns={locationColumns}
                data={locationRows}
                error={error}
                isLoading={isLoading}
                pageSize={25}
            />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </div>
    );
}
