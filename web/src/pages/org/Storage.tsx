import { DataTable } from '@/components/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganizationStorageResources } from '@/data/organization';
import { useTranslation } from '@/lib/i18n';
import type { ApiOrganizationDetails, ApiOrganizationStorageResource } from '@/lib/types';
import { formatBytes, formatNumber, getInitials } from '@/lib/utils';
import { S3 } from '@/svg/S3';
import { type ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router';

type StorageProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    isLoading: boolean;
};

/** Renders organization storage resources and their usage. */
export default function Storage({ organization, organizationDetails, isLoading }: StorageProps) {
    const { t } = useTranslation();
    const {
        items: storageResources,
        error: storageResourcesError,
        isLoading: storageResourcesIsLoading,
    } = useOrganizationStorageResources(organizationDetails?.id ?? '');
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';

    const storageUsageColumn: ColumnDef<ApiOrganizationStorageResource> = {
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
    };

    const storageResourceColumns: Array<ColumnDef<ApiOrganizationStorageResource>> = [
        {
            id: 'resource',
            header: t('columns.resource'),
            cell: ({ row }) => {
                const storageResource = row.original;
                const isShared = storageResource.kind === 'shared_bucket';
                const label = isShared
                    ? t('resources.shared')
                    : (storageResource.application?.name ?? storageResource.name);

                return (
                    <div className="flex items-center gap-3">
                        <S3
                            aria-hidden={true}
                            className="size-10 shrink-0 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0 space-y-1">
                            <div className="truncate font-medium text-foreground">{label}</div>
                            <div className="truncate text-xs text-muted-foreground">{storageResource.bucket_name}</div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            id: 'application',
            header: t('columns.owner'),
            cell: ({ row }) => {
                const application = row.original.application;

                // Show organization ownership for shared buckets.
                if (row.original.kind === 'shared_bucket') {
                    return (
                        <div className="flex items-start gap-3">
                            <Avatar shape="squircle" className="size-9 shrink-0">
                                <AvatarImage src={organizationAvatar} alt={organizationName} />
                                <AvatarFallback>{getInitials(organizationName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 space-y-1">
                                <div className="font-medium text-foreground">{organizationName}</div>
                                <div className="text-xs text-muted-foreground">{t('columns.organization')}</div>
                            </div>
                        </div>
                    );
                }

                // Mark storage resources without an active application.
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
        storageUsageColumn,
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
