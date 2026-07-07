import { DataTable } from '@/components/DataTable';
import { useTranslation } from '@/lib/i18n';
import type { ApiOrganizationDatabaseTable } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';

type DatabaseTableRow = Record<string, string | number | boolean | null>;

/** Renders preview rows for one database table with dynamic columns. */
export function DatabaseTableRows({ table }: { table: ApiOrganizationDatabaseTable }) {
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
