import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { GRID_REPEATS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { Grid as AstryxGrid, type GridColumns } from '@astryxdesign/core/Grid';
import {
    readXmlProp,
    resolveXmlProps,
    xmlPositiveIntegerSchema,
    xmlPositiveNumberSchema,
    xmlSpacingWithDefaultSchema,
} from '../core/props';

const gridPropsSchema = z
    .object({
        columns: xmlPositiveIntegerSchema.optional(),
        gap: xmlSpacingWithDefaultSchema,
        maxColumns: xmlPositiveIntegerSchema.optional(),
        minColumnWidth: xmlPositiveNumberSchema.optional(),
        repeat: z.enum(GRID_REPEATS).optional(),
    })
    .refine(({ columns, minColumnWidth }) => columns == null || minColumnWidth == null, {
        message: 'accepts either columns or minColumnWidth, not both',
    })
    .refine(({ maxColumns, minColumnWidth }) => maxColumns == null || minColumnWidth != null, {
        message: 'maxColumns requires minColumnWidth',
    });

export function Grid({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const {
        columns: columnCount,
        gap,
        maxColumns,
        minColumnWidth: minWidth,
        repeat,
    } = resolveXmlProps(
        props,
        ctx,
        { columns: 'scalar', gap: 'scalar', maxColumns: 'scalar', minColumnWidth: 'scalar', repeat: 'scalar' },
        gridPropsSchema
    );

    if (readXmlProp(props, 'repeat') != null && minWidth == null) {
        throw new Error('Grid repeat requires minColumnWidth');
    }

    const columns: GridColumns | undefined = minWidth != null ? { minWidth, max: maxColumns, repeat } : columnCount;

    return (
        <AstryxGrid columns={columns} gap={gap}>
            {renderNode(nodes, ctx)}
        </AstryxGrid>
    );
}
