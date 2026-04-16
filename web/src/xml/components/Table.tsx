import {
    type ApiTableCell,
    textAlignClasses,
    type ApiTableColumn,
    type TableAlign,
} from '@/components/table/buildColumns';
import { useApiTable } from '@/components/table/useApiTable';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

export type { ApiTableColumn, TableAlign };

type SchemaTableProps = {
    endpoint: string;
    schema: {
        title: string;
        description?: string;
        schema: {
            columns: ApiTableColumn[];
        };
    };
    pageSize?: number;
    data?: never;
    columns?: never;
};

type DataTableProps = {
    data: object[];
    columns: ApiTableColumn[];
    pageSize?: number;
    endpoint?: never;
    schema?: never;
};

type TableProps = SchemaTableProps | DataTableProps;

/** Resolves nested object values from dot-path templates used by table columns. */
function resolvePath(data: unknown, path: string): unknown {
    // Walk object tree with dot-path access from schema config.
    return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], data);
}

/** Renders a template string by replacing {path} placeholders with row values. */
function renderTemplate(template: string, data: unknown): string {
    // Replace each token with matching value from current row.
    return template.replace(/\{([^}]+)\}/g, (_, path) => {
        const value = resolvePath(data, path.trim());
        return value == null ? '' : String(value);
    });
}

/** Builds displayable cell payload from table column config and row data. */
function resolveCell(
    valueTemplate: string | undefined,
    cell: ApiTableCell | string | undefined,
    row: unknown
): ApiTableCell | undefined {
    const resolvedCell = cell ?? valueTemplate;

    if (!resolvedCell) {
        return undefined;
    }

    if (typeof resolvedCell === 'string') {
        return { value: renderTemplate(resolvedCell, row) };
    }

    return {
        ...resolvedCell,
        value: renderTemplate(resolvedCell.value, row),
        link: resolvedCell.link ? renderTemplate(resolvedCell.link, row) : undefined,
    };
}

/** Renders one line inside table cell, optionally as link and bold text. */
function renderCellLine(cell: ApiTableCell, fallbackBold = false) {
    const className = (cell.bold ?? fallbackBold) ? 'font-medium' : '';
    const content = <span className={className}>{cell.value}</span>;

    if (!cell.link) {
        return content;
    }

    return (
        <a className="hover:underline" href={cell.link}>
            {content}
        </a>
    );
}

/** Computes visible content and detail fragments for one table column. */
function buildColumnCell(column: ApiTableColumn, row: unknown) {
    const content = resolveCell(column.value, column.content, row);
    const detail = resolveCell(undefined, column.detail, row);

    return {
        content,
        detail,
    };
}

/** Renders LongLink XML table with shadcn table primitives and plain row rendering. */
export function Table<T extends object>(props: TableProps) {
    const isSchemaMode = 'endpoint' in props;
    const apiData = useApiTable<T>({ endpoint: isSchemaMode ? (props as SchemaTableProps).endpoint : '/__noop__' });

    const data = (isSchemaMode ? apiData.data : props.data) as T[];
    const loading = isSchemaMode ? apiData.loading : false;
    const columns = isSchemaMode ? (props.schema?.schema?.columns ?? []) : props.columns;

    return (
        <div className="overflow-hidden rounded-md border">
            <UITable>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        {columns.map((column) => {
                            const align = column.align ?? 'left';

                            return (
                                <TableHead key={column.key} className={textAlignClasses[align]}>
                                    {column.label ?? column.key}
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell
                                colSpan={Math.max(columns.length, 1)}
                                className="h-24 text-center text-muted-foreground"
                            >
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : data.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <TableRow key={`row-${rowIndex}`}>
                                {columns.map((column) => {
                                    const align = column.align ?? 'left';
                                    const { content, detail } = buildColumnCell(column, row);

                                    return (
                                        <TableCell
                                            key={`${column.key}-${rowIndex}`}
                                            className={textAlignClasses[align]}
                                        >
                                            {/* Keep content/detail rendering from schema while using plain table layout. */}
                                            <div className={`leading-tight ${textAlignClasses[align]}`}>
                                                {content ? (
                                                    <div className="text-sm">{renderCellLine(content, true)}</div>
                                                ) : null}
                                                {detail ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        {renderCellLine(detail)}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={Math.max(columns.length, 1)}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </UITable>
        </div>
    );
}

export default Table;

export { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
