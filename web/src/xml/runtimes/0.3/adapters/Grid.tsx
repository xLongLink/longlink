import { Grid as AstryxGrid, type GridColumns } from '@astryxdesign/core-0-3/Grid';
import { BOX_ALIGNS, GRID_REPEATS, SPACINGS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, readXmlProp, resolveXml } from '../core/props';
import type { Props } from '../types';

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
    if (columnCount != null && typeof columnCount !== 'number') {
        throw new Error('Grid columns must be a positive integer');
    }

    if (minWidth != null && typeof minWidth !== 'number') {
        throw new Error('Grid minColumnWidth must be a positive number');
    }

    if (maxColumns != null && typeof maxColumns !== 'number') {
        throw new Error('Grid maxColumns must be a positive integer');
    }

    if (repeat != null && !isXmlEnum(repeat, GRID_REPEATS)) {
        throw new Error(`Unsupported Grid repeat '${String(repeat)}'`);
    }

    if (gap != null && !isXmlEnum(gap, SPACINGS)) {
        throw new Error(`Unsupported Grid gap '${String(gap)}'`);
    }

    if (rowGap != null && !isXmlEnum(rowGap, SPACINGS)) {
        throw new Error(`Unsupported Grid rowGap '${String(rowGap)}'`);
    }

    if (columnGap != null && !isXmlEnum(columnGap, SPACINGS)) {
        throw new Error(`Unsupported Grid columnGap '${String(columnGap)}'`);
    }

    if (align != null && !isXmlEnum(align, BOX_ALIGNS)) {
        throw new Error(`Unsupported Grid align '${String(align)}'`);
    }

    if (justify != null && !isXmlEnum(justify, BOX_ALIGNS)) {
        throw new Error(`Unsupported Grid justify '${String(justify)}'`);
    }

    if (rowHeight != null && (typeof rowHeight !== 'number' || rowHeight <= 0)) {
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

    const columns: GridColumns | undefined =
        minWidth != null
            ? ({
                  minWidth,
                  ...(maxColumns != null && { max: maxColumns }),
                  ...(repeat === 'fill'
                      ? { repeat: 'fill' as const }
                      : repeat === 'fit'
                        ? { repeat: 'fit' as const }
                        : {}),
              } as const)
            : columnCount;

    return (
        <AstryxGrid
            gap={gap}
            align={align}
            width={typeof width === 'string' || typeof width === 'number' ? width : undefined}
            height={typeof height === 'string' || typeof height === 'number' ? height : undefined}
            rowGap={rowGap}
            justify={justify}
            columns={columns}
            maxWidth={typeof maxWidth === 'string' || typeof maxWidth === 'number' ? maxWidth : undefined}
            columnGap={columnGap}
            rowHeight={typeof rowHeight === 'number' ? rowHeight : undefined}
            minHeight={typeof minHeight === 'string' || typeof minHeight === 'number' ? minHeight : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxGrid>
    );
}
