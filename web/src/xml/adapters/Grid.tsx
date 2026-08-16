import { Grid as AstryxGrid, type GridColumns } from '@astryxdesign/core-0-3/Grid';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { GRID_REPEATS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { isXmlEnum, readXmlProp, resolveXml } from '../core/props';

export function Grid({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const repeat = resolveXml(props, 'repeat', ctx);
    const columnCount = resolveXml(props, 'columns', ctx);
    const minWidth = resolveXml(props, 'minColumnWidth', ctx);
    const maxColumns = resolveXml(props, 'maxColumns', ctx);

    // Reject dynamic values that cannot produce valid CSS grid tracks.
    if (
        columnCount != null &&
        (typeof columnCount !== 'number' ||
            !Number.isFinite(columnCount) ||
            !Number.isInteger(columnCount) ||
            columnCount <= 0)
    ) {
        throw new Error('Grid columns must be a positive integer');
    }

    if (minWidth != null && (typeof minWidth !== 'number' || !Number.isFinite(minWidth) || minWidth <= 0)) {
        throw new Error('Grid minColumnWidth must be a positive number');
    }

    if (
        maxColumns != null &&
        (typeof maxColumns !== 'number' ||
            !Number.isFinite(maxColumns) ||
            !Number.isInteger(maxColumns) ||
            maxColumns <= 0)
    ) {
        throw new Error('Grid maxColumns must be a positive integer');
    }

    if (!isXmlEnum(repeat, [undefined, ...GRID_REPEATS])) {
        throw new Error(`Unsupported Grid repeat '${String(repeat)}'`);
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

    const columns: GridColumns | undefined =
        minWidth != null
            ? ({
                  minWidth,
                  ...(maxColumns != null && { max: maxColumns }),
                  ...(repeat ? { repeat } : {}),
              } as const)
            : columnCount;

    return <AstryxGrid columns={columns}>{renderNode(nodes, ctx)}</AstryxGrid>;
}
