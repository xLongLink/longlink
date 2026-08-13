import { Grid as AstryxGrid, type GridColumns } from '@astryxdesign/core-0-3/Grid';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { GRID_REPEATS } from '../constants';
import { isXmlEnum, readXmlProp, resolveXml } from '../core/props';

/**
 * checked: 2026-08-13
 * https://astryx.atmeta.com/components/Grid?tab=properties
 * - columns: positive integer
 * - maxColumns: positive integer
 * - minColumnWidth: positive number
 * - repeat: 'fill' | 'fit'
 * - children: ReactNode
 */
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
                  ...(repeat === 'fill'
                      ? { repeat: 'fill' as const }
                      : repeat === 'fit'
                        ? { repeat: 'fit' as const }
                        : {}),
              } as const)
            : columnCount;

    return <AstryxGrid columns={columns}>{renderNode(nodes, ctx)}</AstryxGrid>;
}
