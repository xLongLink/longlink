import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, useContext } from '@/xml';
import { Children, isValidElement, type ReactNode } from 'react';

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
    const safeSpan = explicitSpan === undefined ? 1 : Math.max(1, Math.min(12, explicitSpan));
    return Number.isFinite(safeSpan) ? safeSpan : 1;
}

export function Columns({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const gap = evaluate(props.gap ?? '16', context);
    const widths = evaluate(props.widths ?? '', context) as number[] | undefined;
    const columnSpans = Children.toArray(children as any)
        .map(getColumnSpan)
        .filter((span) => span > 0);
    const totalColumns = columnSpans.reduce((sum, span) => sum + span, 0) || 12;
    const style =
        Array.isArray(widths) && widths.length > 0
            ? { gridTemplateColumns: toGridTemplate(widths) }
            : { gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))` };
    return (
        <div className="grid" style={{ ...style, gap: px(gap as number | string | undefined, 16) }}>
            {renderNode(children as any, context.ctx) as unknown as ReactNode}
        </div>
    );
}

export function Column({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const span = evaluate(props.span ?? '', context);
    const width = evaluate(props.width ?? '', context);
    const explicitSpan = (span as number | undefined) ?? (width as number | undefined);
    const safeSpan = explicitSpan === undefined ? 1 : Math.max(1, Math.min(12, explicitSpan));
    return (
        <div className="space-y-4" style={{ gridColumn: `span ${safeSpan}` }}>
            {renderNode(children, context.ctx)}
        </div>
    );
}
