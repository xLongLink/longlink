import { DataTable } from '@/components/DataTable';
import { useOrganizationStorageResources } from '@/hooks/use-organization-storage-resources';
import type { ApiOrganizationDetails, ApiOrganizationStorageResource } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@ui/badge';
import { Link, useParams } from 'react-router';

type StorageProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    isLoading: boolean;
};

/** Renders organization storage resources as a full-page view. */
export default function Storage({ organization, organizationDetails, isLoading }: StorageProps) {
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
            ? new Error(`Storage bucket "${bucket}" not found`)
            : null);

    if (isDetailPage) {
        const storageDetailColumns: Array<ColumnDef<ApiOrganizationStorageResource>> = [
            {
                accessorKey: 'bucket_name',
                header: 'Bucket',
                cell: ({ getValue }) => (
                    <span className="break-all font-medium text-foreground">{getValue<string>()}</span>
                ),
                meta: { className: 'min-w-56' },
            },
            {
                accessorKey: 'storage_registry_name',
                header: 'Registry',
                meta: { className: 'min-w-44' },
            },
            {
                accessorKey: 'kind',
                header: 'Type',
                cell: ({ getValue }) => {
                    const kind = getValue<ApiOrganizationStorageResource['kind']>();

                    return kind === 'shared_bucket' ? 'Shared bucket' : 'Application bucket';
                },
                meta: { className: 'w-44' },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ getValue }) => {
                    const status = getValue<ApiOrganizationStorageResource['status']>();
                    const variant =
                        status === 'available' ? 'default' : status === 'orphaned' ? 'outline' : 'destructive';

                    return <Badge variant={variant}>{status}</Badge>;
                },
                meta: { className: 'w-32' },
            },
        ];

        return (
            <div className="space-y-6">
                <Link
                    to={`/orgs/${organization}/storage`}
                    className="inline-flex text-sm font-medium text-foreground hover:underline"
                >
                    Back to storage
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
            header: 'Resource',
            cell: ({ row }) => {
                const storageResource = row.original;
                const label =
                    storageResource.kind === 'shared_bucket'
                        ? 'shared'
                        : (storageResource.application?.name ?? storageResource.name);

                return (
                    <div className="min-w-0 space-y-1">
                        <Link
                            to={`/orgs/${organization}/storage/buckets/${encodeURIComponent(storageResource.bucket_name)}`}
                            className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {label}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">{storageResource.bucket_name}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            accessorKey: 'kind',
            header: 'Type',
            cell: ({ getValue }) => {
                const kind = getValue<ApiOrganizationStorageResource['kind']>();

                return kind === 'shared_bucket' ? 'Shared bucket' : 'Application bucket';
            },
            meta: { className: 'w-44' },
        },
        {
            id: 'application',
            header: 'Application',
            cell: ({ row }) => {
                const application = row.original.application;

                if (row.original.kind === 'shared_bucket') {
                    return <span className="text-muted-foreground">All applications</span>;
                }

                if (application === null) {
                    return <span className="text-muted-foreground">No active app</span>;
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
            accessorKey: 'status',
            header: 'Status',
            cell: ({ getValue }) => {
                const status = getValue<ApiOrganizationStorageResource['status']>();
                const variant = status === 'available' ? 'default' : status === 'orphaned' ? 'outline' : 'destructive';

                return <Badge variant={variant}>{status}</Badge>;
            },
            meta: { className: 'w-32' },
        },
    ];

    return (
        <div className="space-y-8">
            <DataTable
                columns={storageResourceColumns}
                data={storageResources}
                emptyMessage="No storage resources found."
                error={storageResourcesError}
                isLoading={isLoading || storageResourcesIsLoading}
            />
        </div>
    );
}
