import { Grid as GridShell } from '@ui/grid';
import { useXmlContext } from '../core/context';
import { renderNode } from '../core/node';
import type { Props } from '../types';
import { resolveXmlString } from './props';

/** Props accepted by the XML Grid component. */

/** Renders a full-width grid row. */
export function Grid({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const children = nodes;
    const columns = resolveXmlString(props, 'columns', ctx);

    return (
        <GridShell columns={columns == null ? undefined : String(columns)}>{renderNode(children ?? [], ctx)}</GridShell>
    );
}
