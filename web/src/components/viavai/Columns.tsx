import { type ReactNode } from 'react';

import { type ColumnsElement } from '@/types/viavai/layout.types';
import { isObject } from '@/lib/utils';

type ColumnsProps = {
    widths: number[];
    children: ReactNode[];
};

export function isColumns(element: unknown): element is ColumnsElement {
    if (!isObject(element)) {
        return false;
    }

    return (
        element.type === 'columns' &&
        Array.isArray(element.widths) &&
        Array.isArray(element.columns)
    );
}

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
