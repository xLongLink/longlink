import type { TFunction } from 'i18next';
import { Link } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import type { ApiComputeRegistry, ApiLocation } from '@/lib/types';
import { useLocations } from '@/data/admin';
import { useTranslation } from '@/lib/i18n';
import { useComputes } from '@/data/compute';
import { DataTable } from '@/components/DataTable';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { AdminLocationBadge } from '@/components/admin/AdminTableElements';

/** Returns localized admin compute table columns. */
function createComputeColumns(t: TFunction): Array<ColumnDef<ApiComputeRegistry & { location?: ApiLocation }>> {
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
                                Kubernetes
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{gatewayUrl ?? '—'}</div>
                        </div>
                    </Link>
                );
            },
            meta: { className: 'min-w-56' },
        },
        {
            id: 'location',
            header: t('columns.location'),
            cell: ({ row }) => {
                return <AdminLocationBadge fallbackId={row.original.location_id} location={row.original.location} />;
            },
            meta: { className: 'min-w-56' },
        },
    ];
}

/** Renders the admin compute page. */
export default function AdminCompute() {
    const { t } = useTranslation();
    const { items: computes, error: computesError, isLoading: computesIsLoading } = useComputes();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();

    const locationById = new Map(locations.map((l) => [l.id, l]));
    const computeRows: Array<ApiComputeRegistry & { location?: ApiLocation }> = computes.map((row) => ({
        ...row,
        location: locationById.get(row.location_id),
    }));
    const computeColumns = createComputeColumns(t);

    return (
        <div className="space-y-6">
            <Hero icon="cpu">
                <div>
                    <HeroTitle>{t('admin.computeTitle')}</HeroTitle>
                    <HeroDescription>{t('admin.computeDescription')}</HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={computeColumns}
                data={computeRows}
                error={computesError ?? locationsError}
                isLoading={computesIsLoading || locationsIsLoading}
                pageSize={25}
            />
        </div>
    );
}
