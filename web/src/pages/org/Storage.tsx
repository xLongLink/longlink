import { DataTable } from '@/components/DataTable';
import { useOrganizationStorageResources } from '@/hooks/use-organization-storage-resources';
import { useTranslation } from '@/lib/i18n';
import type { ApiOrganizationDetails, ApiOrganizationStorageResource } from '@/lib/types';
import { formatBytes, formatNumber } from '@/lib/utils';
import { S3 } from '@/svg/S3';
import { type ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router';

type StorageProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    isLoading: boolean;
};

/** Renders organization storage resources as a full-page view. */
export default function Storage({ organization, organizationDetails, isLoading }: StorageProps) {
    const { t } = useTranslation();
    const { bucket = '' } = useParams();
    const {
        items: storageResources,
        error: storageResourcesError,
        isLoading: storageResourcesIsLoading,
    } = useOrganizationStorageResources(organizationDetails?.id ?? '');
    const isDetailPage = bucket.length > 0;

    // Subpages are bucket-selected; the root page intentionally stays as a list-only view.
    const selectedResource = storageResources.find((resource) => resource.bucket_name === bucket) ?? null;
    const detailError =
        storageResourcesError ??
        (!isLoading && !storageResourcesIsLoading && isDetailPage && !selectedResource
            ? new Error(t('resources.storageBucketNotFound', { name: bucket }))
            : null);

    if (isDetailPage) {
        const storageDetailColumns: Array<ColumnDef<ApiOrganizationStorageResource>> = [
            {
                accessorKey: 'bucket_name',
                header: t('columns.bucket'),
                cell: ({ getValue }) => (
                    <div className="flex items-center gap-3">
                        <S3
                            aria-hidden={true}
                            className="size-10 shrink-0 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <span className="break-all font-medium text-foreground">{getValue<string>()}</span>
                    </div>
                ),
                meta: { className: 'min-w-56' },
            },
            {
                accessorKey: 'storage_registry_name',
                header: t('columns.registry'),
                meta: { className: 'min-w-44' },
            },
            {
                id: 'usage',
                header: t('columns.usage'),
                cell: ({ row }) => {
                    const { object_count, space_used } = row.original;

                    return (
                        <div className="min-w-0 space-y-1">
                            <div className="font-medium text-foreground">
                                {space_used === null ? t('common.unknown') : formatBytes(space_used)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {object_count === null
                                    ? t('resources.unknownObjects')
                                    : t('resources.objectCount', { count: formatNumber(object_count) })}
                            </div>
                        </div>
                    );
                },
                meta: { className: 'min-w-40' },
            },
        ];

        return (
            <div className="space-y-6">
                <Link
                    to={`/orgs/${organization}/storage`}
                    className="inline-flex text-sm font-medium text-foreground hover:underline"
                >
                    {t('resources.backToStorage')}
                </Link>

                {isLoading || storageResourcesIsLoading ? null : detailError ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">{detailError.message}</div>
                ) : selectedResource ? (
                    <DataTable columns={storageDetailColumns} data={[selectedResource]} />
                ) : null}
            </div>
        );
    }

    const storageResourceColumns: Array<ColumnDef<ApiOrganizationStorageResource>> = [
        {
            id: 'resource',
            header: t('columns.resource'),
            cell: ({ row }) => {
                const storageResource = row.original;
                const label =
                    storageResource.kind === 'shared_bucket'
                        ? t('resources.shared')
                        : (storageResource.application?.name ?? storageResource.name);

                return (
                    <div className="flex items-center gap-3">
                        <S3
                            aria-hidden={true}
                            className="size-10 shrink-0 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/storage/buckets/${encodeURIComponent(storageResource.bucket_name)}`}
                                className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                            >
                                {label}
                            </Link>
                            <div className="truncate text-xs text-muted-foreground">{storageResource.bucket_name}</div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            id: 'application',
            header: t('columns.application'),
            cell: ({ row }) => {
                const application = row.original.application;

                if (row.original.kind === 'shared_bucket') {
                    return <span className="text-muted-foreground">{t('resources.allApplications')}</span>;
                }

                if (application === null) {
                    return <span className="text-muted-foreground">{t('resources.noActiveApp')}</span>;
                }

                return (
                    <Link
                        to={`/orgs/${organization}/apps/${application.slug}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        {application.name}
                    </Link>
                );
            },
            meta: { className: 'min-w-44' },
        },
        {
            id: 'usage',
            header: t('columns.usage'),
            cell: ({ row }) => {
                const { object_count, space_used } = row.original;

                return (
                    <div className="min-w-0 space-y-1">
                        <div className="font-medium text-foreground">
                            {space_used === null ? t('common.unknown') : formatBytes(space_used)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {object_count === null
                                ? t('resources.unknownObjects')
                                : t('resources.objectCount', { count: formatNumber(object_count) })}
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-40' },
        },
    ];

    return (
        <div className="space-y-8">
            <DataTable
                columns={storageResourceColumns}
                data={storageResources}
                emptyMessage={t('resources.noStorageResources')}
                error={storageResourcesError}
                isLoading={isLoading || storageResourcesIsLoading}
            />
        </div>
    );
}
