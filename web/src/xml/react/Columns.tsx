import type { ASTNode, RenderableASTNode, XmlComponentProps } from '@/xml';
import { renderXml, useProps } from '@/xml';
import type { ReactNode } from 'react';

type ColumnProps = {
    span?: number;
    width?: number;
    children?: RenderableASTNode;
};

/** Converts numeric gap values to CSS pixel values. */
function px(value: number | string | undefined, fallback: number) {
    if (typeof value === 'number') return `${value}px`;
    if (typeof value === 'string' && value.trim()) return /^\d+$/.test(value.trim()) ? `${value.trim()}px` : value;
    return `${fallback}px`;
}

/** Builds a CSS grid template from weighted column widths. */
function toGridTemplate(widths: number[]) {
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (total <= 0) return `repeat(${widths.length || 1}, minmax(0, 1fr))`;
    return widths.map((width) => `minmax(0, ${(width / total) * 100}%)`).join(' ');
}

/** Reads a column span from XML AST params. */
function getColumnSpan(child: ASTNode) {
    if (child.name !== 'Column') return 0;

    const explicitSpan = Number(child.params?.span ?? child.params?.width ?? 1);
    const safeSpan = explicitSpan === undefined ? 1 : Math.max(1, Math.min(12, explicitSpan));
    return Number.isFinite(safeSpan) ? safeSpan : 1;
}

/** Normalizes XML children to an AST node list. */
function childNodes(children: RenderableASTNode): ASTNode[] {
    if (Array.isArray(children)) return children;
    if (children && typeof children === 'object') return [children];
    return [];
}

/** Renders XML children in a column grid. */
export function Columns({ props: rawProps, children }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const gap = props.gap ?? 16;
    const widths = props.widths as number[] | undefined;
    const columnSpans = childNodes(children)
        .map(getColumnSpan)
        .filter((span) => span > 0);
    const totalColumns = columnSpans.reduce((sum, span) => sum + span, 0) || 12;
    const style =
        Array.isArray(widths) && widths.length > 0
            ? { gridTemplateColumns: toGridTemplate(widths) }
            : { gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))` };
    return (
        <div className="grid" style={{ ...style, gap: px(gap as number | string | undefined, 16) }}>
            {renderXml(children as any) as unknown as ReactNode}
        </div>
    );
}

/** Renders a single XML column. */
export function Column({ props: rawProps, children }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const span = props.span;
    const width = props.width;
    const explicitSpan = (span as number | undefined) ?? (width as number | undefined);
    const safeSpan = explicitSpan === undefined ? 1 : Math.max(1, Math.min(12, explicitSpan));
    return (
        <div className="space-y-4" style={{ gridColumn: `span ${safeSpan}` }}>
            {renderXml(children)}
        </div>
    );
}
