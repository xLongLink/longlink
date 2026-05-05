import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import { Children, isValidElement, type ReactNode } from 'react';

type ColumnsProps = {
    gap?: number | string;
    widths?: number[];
    children?: RenderableASTNode;
};

type ColumnProps = {
    span?: number;
    width?: number;
    children?: RenderableASTNode;
};

function px(value: number | string | undefined, fallback: number) {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string' && value.trim()) return /^\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
    return `${fallback}px`;
}


function toGridTemplate(widths: number[]) {
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (total <= 0) return `repeat(${widths.length || 1}, minmax(0, 1fr))`;
    return widths.map((width) => `minmax(0, ${(width / total) * 100}%)`).join(' ');
}


function getColumnSpan(child: ReactNode) {
    if (!isValidElement<ColumnProps>(child)) return 0;
    const explicitSpan = child.props.span ?? child.props.width;
    const safeSpan = explicitSpan === undefined ? 1 : Math.max(1, Math.min(12, Number(explicitSpan)));
    return Number.isFinite(safeSpan) ? safeSpan : 1;
}

export function Columns({ gap = 16, widths, children }: ColumnsProps) {
    const { registry, ctx } = useRuntime();
    const columnSpans = Children.toArray(children)
        .map(getColumnSpan)
        .filter((span) => span > 0);
    const totalColumns = columnSpans.reduce((sum, span) => sum + span, 0) || 12;
    const style =
        Array.isArray(widths) && widths.length > 0
            ? { gridTemplateColumns: toGridTemplate(widths) }
            : { gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))` };
    return (
        <div className="grid" style={{ ...style, gap: px(gap, 16) }}>
            {renderNode(children, registry, ctx)}
        </div>
    );
}

export function Column({ children, span, width }: ColumnProps) {
    const { registry, ctx } = useRuntime();
    const explicitSpan = span ?? width;
    const safeSpan = explicitSpan === undefined ? 1 : Math.max(1, Math.min(12, Number(explicitSpan)));
    return (
        <div className="space-y-4" style={{ gridColumn: `span ${safeSpan}` }}>
            {renderNode(children, registry, ctx)}
        </div>
    );
}
