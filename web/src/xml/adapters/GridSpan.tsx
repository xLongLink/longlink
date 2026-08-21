import { z } from 'zod';
import type { Props } from '../types';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import { GridSpan as AstryxGridSpan } from '@astryxdesign/core/Grid';
import { resolveXmlProps, xmlPositiveIntegerSchema } from '../core/props';

const gridSpanPropsSchema = z.object({
    columns: z.union([z.literal('full'), xmlPositiveIntegerSchema]).optional(),
    rows: xmlPositiveIntegerSchema.optional(),
});

export function GridSpan({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { columns, rows } = resolveXmlProps(props, ctx, { columns: 'scalar', rows: 'scalar' }, gridSpanPropsSchema);

    return (
        <AstryxGridSpan columns={columns} rows={rows}>
            {renderNode(nodes, ctx)}
        </AstryxGridSpan>
    );
}
