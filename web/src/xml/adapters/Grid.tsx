import { Grid as AstryxGrid, type GridColumns } from '@astryxdesign/core/Grid';
import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { resolveXmlEnum, resolveXmlNumber, resolveXmlSizeValue, resolveXmlSpacing } from './props';

/** Renders a fixed or responsive Astryx grid. */
export function Grid({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const columnCount = resolveXmlNumber(props, 'columns', ctx);
    const minWidth = resolveXmlNumber(props, 'minColumnWidth', ctx);
    const maxColumns = resolveXmlNumber(props, 'maxColumns', ctx);
    const repeat = resolveXmlEnum(props, 'repeat', ctx, ['fill', 'fit'], 'fill', 'Grid');
    const columns: GridColumns | undefined = minWidth
        ? { minWidth, ...(maxColumns != null && { max: maxColumns }), repeat }
        : columnCount;
    const gap = resolveXmlSpacing(props, 'gap', ctx);
    const rowGap = resolveXmlSpacing(props, 'rowGap', ctx);
    const columnGap = resolveXmlSpacing(props, 'columnGap', ctx);
    const align = resolveXmlEnum(props, 'align', ctx, ['start', 'center', 'end', 'stretch'], 'stretch', 'Grid');
    const justify = resolveXmlEnum(props, 'justify', ctx, ['start', 'center', 'end', 'stretch'], 'stretch', 'Grid');

    return (
        <AstryxGrid
            align={align}
            columnGap={columnGap}
            columns={columns}
            gap={gap}
            height={resolveXmlSizeValue(props, 'height', ctx)}
            justify={justify}
            maxWidth={resolveXmlSizeValue(props, 'maxWidth', ctx)}
            minHeight={resolveXmlSizeValue(props, 'minHeight', ctx)}
            rowGap={rowGap}
            width={resolveXmlSizeValue(props, 'width', ctx)}
        >
            {renderNode(nodes, ctx)}
        </AstryxGrid>
    );
}
