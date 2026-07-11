import { Link, useParams } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import type {
    ApiOrganizationDatabaseResource,
    ApiOrganizationDatabaseTable,
    ApiOrganizationDetails,
} from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { DataTable } from '@/components/DataTable';
import { formatBytes, formatNumber, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    useOrganizationDatabaseResourceTables,
    useOrganizationDatabaseResources,
    useOrganizationDatabaseTableRows,
} from '@/data/organization';
import { DatabaseTableRows } from './DatabaseTableRows';

type DatabaseProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    isLoading: boolean;
};

/** Renders organization database resources and full-page table previews. */
export default function Database({ organization, organizationDetails, isLoading }: DatabaseProps) {
    const { t } = useTranslation();
    const { databaseResource = '', databaseResourceType = '', databaseTable = '' } = useParams();
    const {
        items: databaseResources,
        error: databaseResourcesError,
        isLoading: databaseResourcesIsLoading,
    } = useOrganizationDatabaseResources(organizationDetails?.id ?? '');
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const selectedKind = databaseResourceType === 'schemas' ? 'schema' : null;
    const isDetailPage = databaseResourceType.length > 0 || databaseResource.length > 0;
    const isTablePage = databaseTable.length > 0;

    // Subpages are path-selected; the root page intentionally stays as a list-only view.
    const selectedResource =
        databaseResources.find(
            (resource) => selectedKind !== null && resource.kind === selectedKind && resource.name === databaseResource
        ) ?? null;
    const detailError =
        databaseResourcesError ??
        (!isLoading && !databaseResourcesIsLoading && isDetailPage && !selectedResource
            ? new Error(t('resources.databaseResourceNotFound', { name: databaseResource }))
            : null);
    const databaseResourceTablesRequest = selectedResource && isDetailPage ? selectedResource : null;
    const {
        items: databaseResourceTables,
        error: databaseResourceTablesError,
        isLoading: databaseResourceTablesIsLoading,
    } = useOrganizationDatabaseResourceTables(organizationDetails?.id ?? '', databaseResourceTablesRequest);
    const selectedTableName = databaseTable;
    const selectedTable = databaseResourceTables.find((table) => table.name === selectedTableName) ?? null;
    const databaseTableRowsRequest = selectedResource && selectedTable && isTablePage ? selectedResource : null;
    const {
        data: databaseTableRows,
        error: databaseTableRowsError,
        isLoading: databaseTableRowsIsLoading,
    } = useOrganizationDatabaseTableRows(organizationDetails?.id ?? '', databaseTableRowsRequest, selectedTableName);
    const tableDetailError =
        detailError ??
        (!databaseResourceTablesIsLoading && isTablePage && !selectedTable
            ? new Error(t('resources.databaseTableNotFound', { name: selectedTableName }))
            : null);

    // Render schema and table detail pages before the root list.
    if (isDetailPage) {
        const databaseTableColumns: Array<ColumnDef<ApiOrganizationDatabaseTable>> = [
            {
                accessorKey: 'name',
                header: t('columns.table'),
                cell: ({ row, getValue }) => (
                    <Link
                        to={`/orgs/${organization}/database/${databaseResourceType}/${encodeURIComponent(databaseResource)}/tables/${encodeURIComponent(row.original.name)}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        {getValue<string>()}
                    </Link>
                ),
                meta: { className: 'min-w-52' },
            },
            {
                accessorKey: 'schema_name',
                header: t('columns.schema'),
                meta: { className: 'min-w-44' },
            },
            {
                id: 'columns',
                header: t('columns.columns'),
                cell: ({ row }) => formatNumber(row.original.columns.length),
                meta: { className: 'w-32' },
            },
        ];

        return (
            <div className="space-y-6">
                <Link
                    to={
                        isTablePage && selectedKind === 'schema'
                            ? `/orgs/${organization}/database/${databaseResourceType}/${encodeURIComponent(databaseResource)}`
                            : `/orgs/${organization}/database`
                    }
                    className="inline-flex text-sm font-medium text-foreground hover:underline"
                >
                    {isTablePage && selectedKind === 'schema'
                        ? t('resources.backToSchema')
                        : t('resources.backToDatabase')}
                </Link>

                {isLoading || databaseResourcesIsLoading ? null : detailError ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">{detailError.message}</div>
                ) : databaseResourceTablesIsLoading ? null : databaseResourceTablesError ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">
                        {databaseResourceTablesError.message}
                    </div>
                ) : isTablePage ? (
                    tableDetailError ? (
                        <div className="rounded-md border p-4 text-sm text-destructive">{tableDetailError.message}</div>
                    ) : databaseTableRowsIsLoading ? null : databaseTableRowsError ? (
                        <div className="rounded-md border p-4 text-sm text-destructive">
                            {databaseTableRowsError.message}
                        </div>
                    ) : selectedTable && databaseTableRows ? (
                        <DatabaseTableRows table={selectedTable} rows={databaseTableRows.rows} />
                    ) : null
                ) : databaseResourceTables.length ? (
                    <DataTable columns={databaseTableColumns} data={databaseResourceTables} />
                ) : (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">
                        {t('resources.noTablesInSchema')}
                    </div>
                )}
            </div>
        );
    }

    const databaseResourceColumns: Array<ColumnDef<ApiOrganizationDatabaseResource>> = [
        {
            id: 'resource',
            header: t('columns.resource'),
            cell: ({ row }) => {
                const databaseResource = row.original;

                return (
                    <div className="min-w-0 space-y-1">
                        <Link
                            to={`/orgs/${organization}/database/schemas/${encodeURIComponent(databaseResource.name)}`}
                            className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {databaseResource.name}
                        </Link>
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
