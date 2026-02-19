import { type ColumnDef } from '@tanstack/react-table';

export type TableAlign = 'left' | 'center' | 'right';

export type ApiTableColumn = {
    key: string;
    label?: string;
    align?: TableAlign;
    value: string;
    detail?: string;
};

export const textAlignClasses: Record<TableAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

function resolvePath(data: unknown, path: string): unknown {
    return path
        .split('.')
        .reduce<unknown>(
            (acc, key) => (acc as Record<string, unknown>)?.[key],
            data
        );
}

function renderTemplate(template: string, data: unknown): string {
    return template.replace(/\{([^}]+)\}/g, (_, path) => {
        const value = resolvePath(data, path.trim());
        return value == null ? '' : String(value);
    });
}

export function buildColumns<T extends object>(
    columns: ApiTableColumn[]
): ColumnDef<T>[] {
    return columns.map((column) => {
        const align = column.align ?? 'left';

        return {
            id: column.key,
            header: column.label ?? column.key,
            enableSorting: true,
            meta: { align },
            cell: ({ row }) => (
                <div className={`leading-tight ${textAlignClasses[align]}`}>
                    <div className="text-sm font-medium">
                        {renderTemplate(column.value, row.original)}
                    </div>

                    {column.detail ? (
                        <div className="text-xs text-muted-foreground">
                            {renderTemplate(column.detail, row.original)}
                        </div>
                    ) : null}
                </div>
            ),
        };
    });
}
