import { Column as ColumnShell, Columns as ColumnsShell } from '@ui/columns';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Columns component. */
export interface ColumnsProps {
    children?: ASTNode[];
}

/** Props accepted by the XML Column component. */
export interface ColumnProps {
    children?: ASTNode[];
    width?: string | number;
}

/** Renders a full-width columns row. */
export function Columns({ children }: ColumnsProps) {
    const { ctx } = useXmlContext();
    const nodes = Array.isArray(children) ? children : children ? [children] : [];
    const widths = nodes
        .filter((node) => node.name === 'Column')
        .map((node) => {
            const rawWidth = node.params?.width ? String(node.params.width) : '100';
            const parsedWidth = Number.parseFloat(rawWidth);

            return Number.isFinite(parsedWidth) ? parsedWidth : 100;
        });
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) || 100;
    const gap = '1.5rem';
    const gapCount = Math.max(widths.length - 1, 0);
    const gapWidth = gapCount > 0 ? `calc(${gap} * ${gapCount})` : '0px';
    const templateColumns = widths.length
        ? widths.map((width) => `minmax(0, calc((100% - ${gapWidth}) * ${width / totalWidth}))`).join(' ')
        : undefined;

    return <ColumnsShell templateColumns={templateColumns}>{renderNode(children ?? [], ctx)}</ColumnsShell>;
}

/** Renders a single width-managed column. */
export function Column({ children, width }: ColumnProps) {
    const { ctx } = useXmlContext();

    return <ColumnShell width={width}>{renderNode(children ?? [], ctx)}</ColumnShell>;
}
