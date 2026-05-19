import { Grid as GridShell } from '@ui/grid';
import type { Props } from '@xml';
import { renderNode, useXmlContext } from '@xml';
import { resolveXmlString } from './props';

/** Props accepted by the XML Grid component. */
export interface GridProps extends Props {}

/** Renders a full-width grid row. */
export function Grid({ props, nodes }: GridProps) {
    const { ctx } = useXmlContext();
    void props;
    void nodes;
    const children = nodes;
    const columns = resolveXmlString(props, 'columns', ctx);

    return (
        <GridShell columns={columns == null ? undefined : String(columns)}>{renderNode(children ?? [], ctx)}</GridShell>
    );
}
