import {
    Children,
    isValidElement,
    type ReactElement,
    type ReactNode,
} from 'react';

type ColumnsProps = {
    widths?: number[];
    children?: ReactNode;
};

type ColumnProps = {
    width?: number;
    children?: ReactNode;
};

type WidthProps = {
    width?: number;
};

function hasUsableWidths(
    widths: number[] | undefined,
    columnsCount: number
): widths is number[] {
    return Array.isArray(widths) && widths.length === columnsCount;
}

function toGridTemplate(widths: number[]) {
    const total = widths.reduce((sum, width) => sum + width, 0);

    if (total <= 0) {
        return `repeat(${widths.length || 1}, minmax(0, 1fr))`;
    }

    return widths
        .map((width) => `minmax(0, ${(width / total) * 100}%)`)
        .join(' ');
}

function getLegacyColumnWidths(columns: ReactNode[]) {
    return columns.map((column) => {
        if (!isValidElement(column)) {
            return 1;
        }

        const columnElement = column as ReactElement<WidthProps>;

        return typeof columnElement.props.width === 'number'
            ? columnElement.props.width
            : 1;
    });
}

export function Columns({ widths, children }: ColumnsProps) {
    const columns = Children.toArray(children);
    const resolvedWidths = hasUsableWidths(widths, columns.length)
        ? widths
        : getLegacyColumnWidths(columns);

    return (
        <div
            className="grid gap-4"
            style={{ gridTemplateColumns: toGridTemplate(resolvedWidths) }}
        >
            {columns.map((column, index) => (
                <div key={`column-${index}`} className="space-y-4">
                    {column}
                </div>
            ))}
        </div>
    );
}

export function Column({ children }: ColumnProps) {
    return <>{children}</>;
}

export default Columns;
