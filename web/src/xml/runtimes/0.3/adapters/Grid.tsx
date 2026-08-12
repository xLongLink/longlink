import { Grid as AstryxGrid } from '@astryxdesign/core-0-3/Grid';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, isXmlNumber, isXmlString, readXmlProp, resolveXml } from '../core/props';
import type { Props } from '../types';

const BOX_ALIGNS = ['start', 'center', 'end', 'stretch'] as const;
const GRID_REPEATS = ['fill', 'fit'] as const;
const SPACING_VALUES = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const;

/** Renders a fixed or responsive Astryx grid. */
export function Grid({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const gap = resolveXml(props, 'gap', ctx);
    const align = resolveXml(props, 'align', ctx);
    const width = resolveXml(props, 'width', ctx);
    const repeat = resolveXml(props, 'repeat', ctx);
    const rowGap = resolveXml(props, 'rowGap', ctx);
    const height = resolveXml(props, 'height', ctx);
    const columnCount = resolveXml(props, 'columns', ctx);
    const justify = resolveXml(props, 'justify', ctx);
    const maxWidth = resolveXml(props, 'maxWidth', ctx);
    const minWidth = resolveXml(props, 'minColumnWidth', ctx);
    const rowHeight = resolveXml(props, 'rowHeight', ctx);
    const columnGap = resolveXml(props, 'columnGap', ctx);
    const minHeight = resolveXml(props, 'minHeight', ctx);
    const maxColumns = resolveXml(props, 'maxColumns', ctx);

    // Keep the XML attributes aligned with Astryx's fixed or responsive column union.
    if (columnCount != null && !isXmlNumber(columnCount)) {
        throw new Error('Grid columns must be a positive integer');
    }

    if (minWidth != null && !isXmlNumber(minWidth)) {
        throw new Error('Grid minColumnWidth must be a positive number');
    }

    if (maxColumns != null && !isXmlNumber(maxColumns)) {
        throw new Error('Grid maxColumns must be a positive integer');
    }

    if (repeat != null && !isXmlEnum(repeat, GRID_REPEATS)) {
        throw new Error(`Unsupported Grid repeat '${String(repeat)}'`);
    }

    if (gap != null && !isXmlEnum(gap, SPACING_VALUES)) {
        throw new Error(`Unsupported Grid gap '${String(gap)}'`);
    }

    if (rowGap != null && !isXmlEnum(rowGap, SPACING_VALUES)) {
        throw new Error(`Unsupported Grid rowGap '${String(rowGap)}'`);
    }

    if (columnGap != null && !isXmlEnum(columnGap, SPACING_VALUES)) {
        throw new Error(`Unsupported Grid columnGap '${String(columnGap)}'`);
    }

    if (align != null && !isXmlEnum(align, BOX_ALIGNS)) {
        throw new Error(`Unsupported Grid align '${String(align)}'`);
    }

    if (justify != null && !isXmlEnum(justify, BOX_ALIGNS)) {
        throw new Error(`Unsupported Grid justify '${String(justify)}'`);
    }

    if (rowHeight != null && (!isXmlNumber(rowHeight) || rowHeight <= 0)) {
        throw new Error('Grid rowHeight must be a positive number');
    }

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
                  ...(repeat != null && { repeat }),
               }
            : columnCount;

    return (
        <AstryxGrid
            gap={gap}
            align={align}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
            height={isXmlString(height) || isXmlNumber(height) ? height : undefined}
            rowGap={rowGap}
            justify={justify}
            columns={columns}
            maxWidth={isXmlString(maxWidth) || isXmlNumber(maxWidth) ? maxWidth : undefined}
            columnGap={columnGap}
            rowHeight={isXmlNumber(rowHeight) ? rowHeight : undefined}
            minHeight={isXmlString(minHeight) || isXmlNumber(minHeight) ? minHeight : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxGrid>
    );
}
