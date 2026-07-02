import { DataTable } from '@/components/DataTable';
import { useOrganizationDatabaseResourceTables } from '@/hooks/use-organization-database-resource-tables';
import { useOrganizationDatabaseResources } from '@/hooks/use-organization-database-resources';
import type {
    ApiOrganizationDatabaseResource,
    ApiOrganizationDatabaseTable,
    ApiOrganizationDetails,
} from '@/lib/types';
import { formatBytes, formatNumber } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@ui/badge';
import { Link, useParams } from 'react-router';

type DatabaseProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    isLoading: boolean;
};

/** Renders organization database resources and full-page table previews. */
export default function Database({ organization, organizationDetails, isLoading }: DatabaseProps) {
    const { databaseResource = '', databaseResourceType = '', databaseTable = '' } = useParams();
    const {
        items: databaseResources,
        error: databaseResourcesError,
        isLoading: databaseResourcesIsLoading,
    } = useOrganizationDatabaseResources(organizationDetails?.id ?? '');
    const selectedKind =
        databaseResourceType === 'schemas' ? 'schema' : databaseResourceType === 'tables' ? 'shared_table' : null;
    const isDetailPage = databaseResourceType.length > 0 || databaseResource.length > 0;
    const isTablePage = databaseTable.length > 0 || selectedKind === 'shared_table';

    // Subpages are path-selected; the root page intentionally stays as a list-only view.
    const selectedResource =
        databaseResources.find(
            (resource) =>
                selectedKind !== null &&
                resource.kind === selectedKind &&
                resource.name === databaseResource &&
                (resource.status === 'available' || resource.status === 'orphaned')
        ) ?? null;
    const detailError =
        databaseResourcesError ??
        (!isLoading && !databaseResourcesIsLoading && isDetailPage && !selectedResource
            ? new Error(`Database resource "${databaseResource}" not found`)
            : null);
    const databaseResourceTablesRequest = selectedResource && isDetailPage ? selectedResource : null;
    const {
        items: databaseResourceTables,
        error: databaseResourceTablesError,
        isLoading: databaseResourceTablesIsLoading,
    } = useOrganizationDatabaseResourceTables(organizationDetails?.id ?? '', databaseResourceTablesRequest);
    const selectedTableName = selectedKind === 'shared_table' ? databaseResource : databaseTable;
    const selectedTable = databaseResourceTables.find((table) => table.name === selectedTableName) ?? null;
    const tableDetailError =
        detailError ??
        (!databaseResourceTablesIsLoading && isTablePage && !selectedTable
            ? new Error(`Database table "${selectedTableName}" not found`)
            : null);

    if (isDetailPage) {
        const databaseTableColumns: Array<ColumnDef<ApiOrganizationDatabaseTable>> = [
            {
                accessorKey: 'name',
                header: 'Table',
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
                header: 'Schema',
                meta: { className: 'min-w-44' },
            },
            {
                id: 'columns',
                header: 'Columns',
                cell: ({ row }) => formatNumber(row.original.columns.length),
                meta: { className: 'w-32' },
            },
            {
                id: 'rows',
                header: 'Preview rows',
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
                    {isTablePage && selectedKind === 'schema' ? 'Back to schema' : 'Back to database'}
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
                        No tables found in this schema.
                    </div>
                )}
            </div>
        );
    }

    const databaseResourceColumns: Array<ColumnDef<ApiOrganizationDatabaseResource>> = [
        {
            id: 'resource',
            header: 'Resource',
            cell: ({ row }) => {
                const databaseResource = row.original;
                const isBrowsable = databaseResource.status === 'available' || databaseResource.status === 'orphaned';

                return (
                    <div className="min-w-0 space-y-1">
                        {isBrowsable ? (
                            <Link
                                to={`/orgs/${organization}/database/${databaseResource.kind === 'shared_table' ? 'tables' : 'schemas'}/${encodeURIComponent(databaseResource.name)}`}
                                className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                            >
                                {databaseResource.name}
                            </Link>
                        ) : (
                            <span className="block truncate font-medium text-muted-foreground">
                                {databaseResource.name}
                            </span>
                        )}
                        <div className="truncate text-xs text-muted-foreground">{databaseResource.database_name}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-44' },
        },
        {
            id: 'application',
            header: 'Application',
            cell: ({ row }) => {
                const databaseResource = row.original;
                const application = databaseResource.application;

                if (databaseResource.kind === 'shared_table') {
                    return (
                        <div className="min-w-0 space-y-1">
                            <div className="font-medium text-foreground">All applications</div>
                            <div className="text-xs text-muted-foreground">Shared organization users</div>
                        </div>
                    );
                }

                if (application === null) {
                    return <span className="text-muted-foreground">No active app</span>;
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
            accessorKey: 'status',
            header: 'Status',
            cell: ({ getValue }) => {
                const status = getValue<ApiOrganizationDatabaseResource['status']>();
                const variant = status === 'available' ? 'default' : status === 'orphaned' ? 'outline' : 'destructive';

                return <Badge variant={variant}>{status}</Badge>;
            },
            meta: { className: 'w-32' },
        },
        {
            id: 'usage',
            header: 'Usage',
            cell: ({ row }) => {
                const { row_estimate, space_used, table_count } = row.original;

                return (
                    <div className="min-w-0 space-y-1">
                        <div className="font-medium text-foreground">
                            {space_used === null ? 'Unknown' : formatBytes(space_used)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {table_count === null ? 'Unknown tables' : `${formatNumber(table_count)} tables`} ·{' '}
                            {row_estimate === null ? 'unknown rows' : `${formatNumber(row_estimate)} rows`}
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
                  header: 'No columns',
                  cell: () => <span className="text-muted-foreground">No columns</span>,
              },
          ];

    return <DataTable columns={databaseRowColumns} data={table.rows} emptyMessage="No rows found." />;
}
