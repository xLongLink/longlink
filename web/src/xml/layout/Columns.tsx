import { type ReactNode } from 'react';

type ColumnsProps = {
    gap?: number | string;
    widths?: number[];
    children?: ReactNode;
};

type ColumnProps = {
    span?: number;
    width?: number;
    children?: ReactNode;
};

function px(value: number | string | undefined, fallback: number) {
    if (typeof value === 'number') {
        return `${value}px`;
    }

    if (typeof value === 'string' && value.trim()) {
        return /^\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
    }

    return `${fallback}px`;
}

function toGridTemplate(widths: number[]) {
    const total = widths.reduce((sum, width) => sum + width, 0);

    if (total <= 0) {
        return `repeat(${widths.length || 1}, minmax(0, 1fr))`;
    }

    return widths.map((width) => `minmax(0, ${(width / total) * 100}%)`).join(' ');
}

export function Columns({ gap = 16, widths, children }: ColumnsProps) {
    const style =
        Array.isArray(widths) && widths.length > 0
            ? { gridTemplateColumns: toGridTemplate(widths) }
            : { gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' };

    return (
        <div className="grid" style={{ ...style, gap: px(gap, 16) }}>
            {children}
        </div>
    );
}

export function Column({ children, span, width }: ColumnProps) {
    const safeSpan = Math.max(1, Math.min(12, Number(span ?? width ?? 1)));

    return (
        <div className="space-y-4" style={{ gridColumn: `span ${safeSpan} / span ${safeSpan}` }}>
            {children}
        </div>
    );
}

export default Columns;
