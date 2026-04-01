import { type ColumnDef } from '@tanstack/react-table';

export type TableAlign = 'left' | 'center' | 'right';

export type ApiTableCell = {
    value: string;
    bold?: boolean;
    link?: string;
};

export type ApiTableColumn = {
    key: string;
    label?: string;
    align?: TableAlign;
    value?: string;
    detail?: string | ApiTableCell;
    content?: ApiTableCell;
};

export const textAlignClasses: Record<TableAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

function resolvePath(data: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], data);
}

function renderTemplate(template: string, data: unknown): string {
    return template.replace(/\{([^}]+)\}/g, (_, path) => {
        const value = resolvePath(data, path.trim());
        return value == null ? '' : String(value);
    });
}

function resolveCell(
    legacyValue: string | undefined,
    cell: ApiTableCell | string | undefined,
    row: unknown
): ApiTableCell | undefined {
    const resolvedCell = cell ?? legacyValue;

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

function renderCellRow(cell: ApiTableCell, fallbackBold = false) {
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

export function buildColumns<T extends object>(columns: ApiTableColumn[]): ColumnDef<T>[] {
    return columns.map((column) => {
        const align = column.align ?? 'left';

        return {
            id: column.key,
            header: column.label ?? column.key,
            enableSorting: true,
            meta: { align },
            cell: ({ row }) => {
                const content = resolveCell(column.value, column.content, row.original);
                const detail = resolveCell(undefined, column.detail, row.original);

                return (
                    <div className={`leading-tight ${textAlignClasses[align]}`}>
                        {content ? <div className="text-sm">{renderCellRow(content, true)}</div> : null}

                        {detail ? <div className="text-xs text-muted-foreground">{renderCellRow(detail)}</div> : null}
                    </div>
                );
            },
        };
    });
}
