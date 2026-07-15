import type { Props } from '@/xml/types';
import { renderNode } from '@/xml/core/node';
import { useXmlContext } from '@/xml/core/context';
import { Grid as GridShell } from '@/components/ui/grid';
import { resolveXmlString } from './props';

/** Renders a full-width grid row. */
export function Grid({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const columns = resolveXmlString(props, 'columns', ctx);

    return <GridShell columns={columns == null ? undefined : String(columns)}>{renderNode(nodes, ctx)}</GridShell>;
}
