import { Column as ColumnShell, Columns as ColumnsShell } from '@ui/columns';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Renders a full-width columns row. */
export function Columns({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const columnNodes = Array.isArray(children) ? children : children ? [children] : [];
    const widths = columnNodes
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
export function Column({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const width = resolveXmlString(props, 'width', ctx);

    return <ColumnShell width={width}>{renderNode(children ?? [], ctx)}</ColumnShell>;
}
