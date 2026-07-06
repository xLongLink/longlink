import { DataTable } from '@/components/DataTable';
import { useOrganizationDatabaseResourceTables } from '@/hooks/use-organization-database-resource-tables';
import { useOrganizationDatabaseResources } from '@/hooks/use-organization-database-resources';
import { useTranslation } from '@/lib/i18n';
import type {
    ApiOrganizationDatabaseResource,
    ApiOrganizationDatabaseTable,
    ApiOrganizationDetails,
} from '@/lib/types';
import { formatBytes, formatNumber } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router';

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
    const tableDetailError =
        detailError ??
        (!databaseResourceTablesIsLoading && isTablePage && !selectedTable
            ? new Error(t('resources.databaseTableNotFound', { name: selectedTableName }))
            : null);

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
            {
                id: 'rows',
                header: t('columns.previewRows'),
                cell: ({ row }) => formatNumber(row.original.rows.length),
                meta: { className: 'w-36' },
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
                    ) : selectedTable ? (
                        <DatabaseTableRows table={selectedTable} />
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
            header: t('columns.application'),
            cell: ({ row }) => {
                const databaseResource = row.original;
                const application = databaseResource.application;

                if (databaseResource.name === 'shared') {
                    return (
                        <div className="min-w-0 space-y-1">
                            <div className="font-medium text-foreground">{t('resources.allApplications')}</div>
                            <div className="text-xs text-muted-foreground">
                                {t('resources.sharedOrganizationUsers')}
                            </div>
                        </div>
                    );
                }

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
                const { row_estimate, space_used, table_count } = row.original;

                return (
                    <div className="min-w-0 space-y-1">
                        <div className="font-medium text-foreground">
                            {space_used === null ? t('common.unknown') : formatBytes(space_used)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {table_count === null
                                ? t('resources.unknownTables')
                                : t('resources.tableCount', { count: formatNumber(table_count) })}{' '}
                            ·{' '}
                            {row_estimate === null
                                ? t('resources.unknownRows')
                                : t('resources.rowCount', { count: formatNumber(row_estimate) })}
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

type DatabaseTableRowsProps = {
    table: ApiOrganizationDatabaseTable;
};

type DatabaseTableRow = Record<string, string | number | boolean | null>;

/** Renders preview rows for one database table with dynamic columns. */
function DatabaseTableRows({ table }: DatabaseTableRowsProps) {
    const { t } = useTranslation();
    const databaseRowColumns: Array<ColumnDef<DatabaseTableRow>> = table.columns.length
        ? table.columns.map((column) => ({
              id: column.name,
              header: column.name,
              cell: ({ row }) => {
                  const value = row.original[column.name];

                  return value === null || value === undefined ? (
                      <span className="text-muted-foreground">NULL</span>
                  ) : (
                      <span className="font-mono text-xs">{String(value)}</span>
                  );
              },
              meta: { className: 'max-w-72 truncate' },
          }))
        : [
              {
                  id: 'empty',
                  header: t('resources.noColumns'),
                  cell: () => <span className="text-muted-foreground">{t('resources.noColumns')}</span>,
              },
          ];

    return <DataTable columns={databaseRowColumns} data={table.rows} emptyMessage={t('resources.noRows')} />;
}
