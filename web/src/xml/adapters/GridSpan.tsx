import type { Props } from '../types';
import { renderNode } from '../core/node';
import { resolveXml } from '../core/props';
import { useXmlRuntime } from '../core/context';
import { GridSpan as AstryxGridSpan } from '@astryxdesign/core/Grid';

export function GridSpan({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const columns = resolveXml(props, 'columns', ctx);
    const rows = resolveXml(props, 'rows', ctx);

    if (
        columns != null &&
        columns !== 'full' &&
        (typeof columns !== 'number' || !Number.isFinite(columns) || !Number.isInteger(columns) || columns <= 0)
    ) {
        throw new Error("GridSpan columns must be a positive integer or 'full'");
    }

    if (rows != null && (typeof rows !== 'number' || !Number.isFinite(rows) || !Number.isInteger(rows) || rows <= 0)) {
        throw new Error('GridSpan rows must be a positive integer');
    }

    return (
        <AstryxGridSpan columns={columns} rows={rows}>
            {renderNode(nodes, ctx)}
        </AstryxGridSpan>
    );
}
