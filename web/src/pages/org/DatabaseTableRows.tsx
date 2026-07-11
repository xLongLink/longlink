import { type ColumnDef } from '@tanstack/react-table';
import type { ApiOrganizationDatabaseTable, ApiOrganizationDatabaseTableRows } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { DataTable } from '@/components/DataTable';

type DatabaseTableRow = Record<string, string>;
type DatabaseTableRowsProps = {
    table: ApiOrganizationDatabaseTable;
    rows: ApiOrganizationDatabaseTableRows['rows'];
};

/** Renders preview rows for one database table with dynamic columns. */
export function DatabaseTableRows({ table, rows }: DatabaseTableRowsProps) {
    const { t } = useTranslation();
    const databaseRowColumns: Array<ColumnDef<DatabaseTableRow>> = table.columns.length
        ? table.columns.map((column) => ({
              id: column.name,
              header: column.name,
              cell: ({ row }) => {
                  const value = row.original[column.name];

                  return <span className="font-mono text-xs">{value}</span>;
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

    return <DataTable columns={databaseRowColumns} data={rows} emptyMessage={t('resources.noRows')} />;
}
