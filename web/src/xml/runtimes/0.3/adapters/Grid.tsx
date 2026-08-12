import { Grid as AstryxGrid, type GridColumns } from '@astryxdesign/core-0-3/Grid';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { readXmlProp, resolveXml } from '../core/props';
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

    if (repeat != null && repeat !== 'fill' && repeat !== 'fit') {
        throw new Error(`Unsupported Grid repeat '${String(repeat)}'`);
    }

    if (
        gap != null &&
        gap !== 0 &&
        gap !== 0.5 &&
        gap !== 1 &&
        gap !== 1.5 &&
        gap !== 2 &&
        gap !== 3 &&
        gap !== 4 &&
        gap !== 5 &&
        gap !== 6 &&
        gap !== 8 &&
        gap !== 10
    ) {
        throw new Error(`Unsupported Grid gap '${String(gap)}'`);
    }

    if (
        rowGap != null &&
        rowGap !== 0 &&
        rowGap !== 0.5 &&
        rowGap !== 1 &&
        rowGap !== 1.5 &&
        rowGap !== 2 &&
        rowGap !== 3 &&
        rowGap !== 4 &&
        rowGap !== 5 &&
        rowGap !== 6 &&
        rowGap !== 8 &&
        rowGap !== 10
    ) {
        throw new Error(`Unsupported Grid rowGap '${String(rowGap)}'`);
    }

    if (
        columnGap != null &&
        columnGap !== 0 &&
        columnGap !== 0.5 &&
        columnGap !== 1 &&
        columnGap !== 1.5 &&
        columnGap !== 2 &&
        columnGap !== 3 &&
        columnGap !== 4 &&
        columnGap !== 5 &&
        columnGap !== 6 &&
        columnGap !== 8 &&
        columnGap !== 10
    ) {
        throw new Error(`Unsupported Grid columnGap '${String(columnGap)}'`);
    }

    if (align != null && align !== 'start' && align !== 'center' && align !== 'end' && align !== 'stretch') {
        throw new Error(`Unsupported Grid align '${String(align)}'`);
    }

    if (justify != null && justify !== 'start' && justify !== 'center' && justify !== 'end' && justify !== 'stretch') {
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
