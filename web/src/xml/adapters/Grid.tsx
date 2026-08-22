import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { GRID_REPEATS } from '../constants';
import { useXmlRuntime } from '../core/context';
import { Grid as AstryxGrid } from '@astryxdesign/core/Grid';
import {
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
    })
    .refine(({ minColumnWidth, repeat }) => repeat == null || minColumnWidth != null, {
        message: 'repeat requires minColumnWidth',
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

    return (
        <AstryxGrid columns={minWidth != null ? { minWidth, max: maxColumns, repeat } : columnCount} gap={gap}>
            {renderNode(nodes, ctx)}
        </AstryxGrid>
    );
}
