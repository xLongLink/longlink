import { cn } from 'cn';
import { useDataGrid } from './data-grid';
import { renderGridContent } from './render';
import { ScrollArea } from '@base-ui/react/scroll-area';

// Noninteractive rendering path from https://reui.io/r/base-nova/data-grid-table.json.
// The registry owns the semantic table; TanStack owns headers, row models and cell identity.
export function DataGridTable<TData extends object>({ renderHeader = true }: { renderHeader?: boolean }) {
    const { table, tableLayout, tableClassNames, emptyMessage } = useDataGrid<TData>();
    const columns = table.getVisibleLeafColumns();
    const rows = table.getRowModel().rows;
    const minWidth = columns.reduce((total, column) => total + (column.columnDef.meta?.minWidth ?? 0), 0);

    // Keep Base UI's measurement and tab order while retaining native scrollbar presentation.
    return (
        <ScrollArea.Root className="view-table-scroll-area">
            <ScrollArea.Viewport
                data-slot="data-grid-table-viewport"
                role="group"
                aria-label="Table"
                render={(props) => (
                    <div {...props} className="view-table-viewport" style={{ ...props.style, overflow: 'auto' }} />
                )}
            >
                <ScrollArea.Content style={{ minWidth: 0 }}>
                    <table
                        data-slot="data-grid-table"
                        data-dense={tableLayout?.dense || undefined}
                        data-striped={tableLayout?.stripped || undefined}
                        data-row-border={tableLayout?.rowBorder || undefined}
                        data-header-border={tableLayout?.headerBorder || undefined}
                        className={cn('view-table', tableClassNames?.base)}
                        style={{ minWidth, tableLayout: tableLayout?.width ?? 'fixed' }}
                    >
                        <colgroup>
                            {columns.map((column) => (
                                <col
                                    key={column.id}
                                    style={{ width: column.columnDef.meta?.width ?? column.getSize() }}
                                />
                            ))}
                        </colgroup>
                        {renderHeader && (
                            <thead className={tableClassNames?.header}>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id} className={tableClassNames?.headerRow}>
                                        {headerGroup.headers.map((header) => (
                                            <th
                                                key={header.id}
                                                scope="col"
                                                colSpan={header.colSpan}
                                                className={header.column.columnDef.meta?.headerClassName}
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : renderGridContent(
                                                          header.column.columnDef.header,
                                                          header.getContext()
                                                      )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                        )}
                        <tbody data-slot="data-grid-table-body" className={tableClassNames?.body}>
                            {rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} data-row-id={row.id} className={tableClassNames?.bodyRow}>
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                                                {renderGridContent(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={Math.max(columns.length, 1)} data-slot="data-grid-table-empty">
                                        {emptyMessage}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea.Content>
            </ScrollArea.Viewport>
        </ScrollArea.Root>
    );
}
