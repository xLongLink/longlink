import { Grid as AstryxGrid } from '@astryxdesign/core-0-3/Grid';
import { useXmlRuntime } from '../core/context';
import { renderNode } from '../core/node';
import { isXmlEnum, isXmlNumber, isXmlString, readXmlProp, resolveXml } from '../core/props';
import type { Props } from '../types';

/** Renders a fixed or responsive Astryx grid. */
export function Grid({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const columnCountValue = resolveXml(props, 'columns', ctx);
    const minWidthValue = resolveXml(props, 'minColumnWidth', ctx);
    const maxColumnsValue = resolveXml(props, 'maxColumns', ctx);
    const columnCount = isXmlNumber(columnCountValue) ? columnCountValue : undefined;
    const minWidth = isXmlNumber(minWidthValue) ? minWidthValue : undefined;
    const maxColumns = isXmlNumber(maxColumnsValue) ? maxColumnsValue : undefined;

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

    const repeatValue = resolveXml(props, 'repeat', ctx);
    const columns =
        minWidth != null
            ? {
                  minWidth,
                  ...(maxColumns != null && { max: maxColumns }),
                  repeat: isXmlEnum(repeatValue, ['fill', 'fit']) ? repeatValue : 'fill',
              }
            : columnCount;
    const gap = resolveXml(props, 'gap', ctx);
    const rowGap = resolveXml(props, 'rowGap', ctx);
    const columnGap = resolveXml(props, 'columnGap', ctx);
    const alignValue = resolveXml(props, 'align', ctx);
    const justifyValue = resolveXml(props, 'justify', ctx);
    const height = resolveXml(props, 'height', ctx);
    const maxWidth = resolveXml(props, 'maxWidth', ctx);
    const minHeight = resolveXml(props, 'minHeight', ctx);
    const width = resolveXml(props, 'width', ctx);
    const align = isXmlEnum(alignValue, ['start', 'center', 'end', 'stretch']) ? alignValue : 'stretch';
    const justify = isXmlEnum(justifyValue, ['start', 'center', 'end', 'stretch']) ? justifyValue : 'stretch';

    return (
        <AstryxGrid
            align={align}
            columnGap={isXmlEnum(columnGap, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? columnGap : undefined}
            columns={columns}
            gap={isXmlEnum(gap, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? gap : undefined}
            height={isXmlString(height) || isXmlNumber(height) ? height : undefined}
            justify={justify}
            maxWidth={isXmlString(maxWidth) || isXmlNumber(maxWidth) ? maxWidth : undefined}
            minHeight={isXmlString(minHeight) || isXmlNumber(minHeight) ? minHeight : undefined}
            rowGap={isXmlEnum(rowGap, [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]) ? rowGap : undefined}
            width={isXmlString(width) || isXmlNumber(width) ? width : undefined}
        >
            {renderNode(nodes, ctx)}
        </AstryxGrid>
    );
}
