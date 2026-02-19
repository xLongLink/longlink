import { type ReactNode } from 'react';

type ColumnsProps = {
    widths: number[];
    children?: ReactNode;
};

type ColumnProps = {
    width?: number;
    children?: ReactNode;
};

function toGridTemplate(widths: number[]) {
    const total = widths.reduce((sum, width) => sum + width, 0);

    if (total <= 0) {
        return `repeat(${widths.length || 1}, minmax(0, 1fr))`;
    }

    return widths
        .map((width) => `minmax(0, ${(width / total) * 100}%)`)
        .join(' ');
}

export function Columns({ widths, children }: ColumnsProps) {
    return (
        <div
            className="grid gap-4"
            style={{ gridTemplateColumns: toGridTemplate(widths) }}
        >
            {children}
        </div>
    );
}

export function Column({ children }: ColumnProps) {
    return <div className="space-y-4">{children}</div>;
}

export default Columns;
