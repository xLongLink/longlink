import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import type { TFunction } from 'i18next';
import { toast } from 'sonner';

import { AdminActionMenu, AdminLocationBadge } from '@/components/admin/AdminTableElements';
import { DataTable } from '@/components/DataTable';
import CreateLocationDialog from '@/components/dialogs/CreateLocationDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useLocations } from '@/hooks/use-locations';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiVoid } from '@/lib/api';
import { locationsQueryKey } from '@/lib/query-keys';
import type { ApiLocation } from '@/lib/types';
import { useDeleteDialog } from '@/lib/utils';

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
            await fetchApiVoid(`/api/locations/${locationId}`, {
                method: 'DELETE',
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: locationsQueryKey() });
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
                {canManage ? <CreateLocationDialog /> : null}
            </div>
            <DataTable columns={locationColumns} data={locationRows} error={error} isLoading={isLoading} />
            <DeleteConfirmationDialog {...deleteDialog.dialogProps} />
        </div>
    );
}
