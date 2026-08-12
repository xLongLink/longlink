import { Grid as AstryxGrid } from '@astryxdesign/core-0-3/Grid';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { readXmlProp, resolveXmlEnum, resolveXmlNumber, resolveXmlSizeValue, resolveXmlSpacing } from '../core/props';
import type { Props } from '../types';

/** Renders a fixed or responsive Astryx grid. */
export function Grid({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const columnCount = resolveXmlNumber(props, 'columns', ctx);
    const minWidth = resolveXmlNumber(props, 'minColumnWidth', ctx);
    const maxColumns = resolveXmlNumber(props, 'maxColumns', ctx);

    // Keep the XML attributes aligned with Astryx's fixed or responsive column union.
    if (columnCount != null && minWidth != null) {
        throw new Error('Grid accepts either columns or minColumnWidth, not both');
    }

    if (maxColumns != null && minWidth == null) {
        throw new Error('Grid maxColumns requires minColumnWidth');
    }

    if (readXmlProp(props, 'repeat') != null && minWidth == null) {
        throw new Error('Grid repeat requires minColumnWidth');
    }

    // Reject dynamic values that cannot produce valid CSS grid tracks.
    if (columnCount != null && (!Number.isFinite(columnCount) || !Number.isInteger(columnCount) || columnCount <= 0)) {
        throw new Error('Grid columns must be a positive integer');
    }

    if (minWidth != null && (!Number.isFinite(minWidth) || minWidth <= 0)) {
        throw new Error('Grid minColumnWidth must be a positive number');
    }

    if (maxColumns != null && (!Number.isFinite(maxColumns) || !Number.isInteger(maxColumns) || maxColumns <= 0)) {
        throw new Error('Grid maxColumns must be a positive integer');
    }

    const columns =
        minWidth != null
            ? {
                  minWidth,
                  ...(maxColumns != null && { max: maxColumns }),
                   repeat: resolveXmlEnum(props, 'repeat', ctx, ['fill', 'fit'], 'Grid') ?? 'fill',
              }
            : columnCount;
    const gap = resolveXmlSpacing(props, 'gap', ctx);
    const rowGap = resolveXmlSpacing(props, 'rowGap', ctx);
    const columnGap = resolveXmlSpacing(props, 'columnGap', ctx);
    const align = resolveXmlEnum(props, 'align', ctx, ['start', 'center', 'end', 'stretch'], 'Grid') ?? 'stretch';
    const justify = resolveXmlEnum(props, 'justify', ctx, ['start', 'center', 'end', 'stretch'], 'Grid') ?? 'stretch';

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
