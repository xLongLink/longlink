import { type ReactNode } from 'react';

type ColumnsProps = {
    widths: number[];
    children: ReactNode[];
};

function toGridTemplate(widths: number[]) {
    if (widths.length === 0) {
        return '1fr';
    }

    const total = widths.reduce((sum, width) => sum + width, 0);

    if (total <= 0) {
        return `repeat(${widths.length}, minmax(0, 1fr))`;
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
            {children.map((child, index) => (
                <div key={`column-${index}`} className="space-y-4">
                    {child}
                </div>
            ))}
        </div>
    );
}

export default Columns;
