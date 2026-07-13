import { Link } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import type { ApiOrganizationDatabaseResource, ApiOrganizationDetails } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { DataTable } from '@/components/DataTable';
import { formatBytes, formatNumber, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganizationDatabaseResources } from '@/data/organization';

type DatabaseProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    isLoading: boolean;
};

/** Renders organization database resources and their usage. */
export default function Database({ organization, organizationDetails, isLoading }: DatabaseProps) {
    const { t } = useTranslation();
    const {
        items: databaseResources,
        error: databaseResourcesError,
        isLoading: databaseResourcesIsLoading,
    } = useOrganizationDatabaseResources(organizationDetails?.id ?? '');
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';

    const databaseResourceColumns: Array<ColumnDef<ApiOrganizationDatabaseResource>> = [
        {
            id: 'resource',
            header: t('columns.resource'),
            cell: ({ row }) => {
                const databaseResource = row.original;

                return (
                    <div className="min-w-0 space-y-1">
                        <div className="truncate font-medium text-foreground">{databaseResource.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{databaseResource.database_name}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-44' },
        },
        {
            id: 'application',
            header: t('columns.owner'),
            cell: ({ row }) => {
                const databaseResource = row.original;
                const application = databaseResource.application;

                // Show organization ownership for the shared schema.
                if (databaseResource.name === 'shared') {
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

                // Mark database resources without an active application.
                if (application === null) {
                    return <span className="text-muted-foreground">{t('resources.noActiveApp')}</span>;
                }

                return (
                    <div className="min-w-0 space-y-1">
                        <Link
                            to={`/orgs/${organization}/apps/${application.slug}`}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                            {application.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{application.status}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            id: 'usage',
            header: t('columns.usage'),
            cell: ({ row }) => {
                const { space_used, table_count } = row.original;

                return (
                    <div className="min-w-0 space-y-1">
                        <div className="font-medium text-foreground">
                            {space_used === null ? t('common.unknown') : formatBytes(space_used)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {table_count === null
                                ? t('resources.unknownTables')
                                : t('resources.tableCount', { count: formatNumber(table_count) })}
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-44' },
        },
    ];

    return (
        <div className="space-y-8">
            <DataTable
                columns={databaseResourceColumns}
                data={databaseResources}
                error={databaseResourcesError}
                isLoading={isLoading || databaseResourcesIsLoading}
            />
        </div>
    );
}
