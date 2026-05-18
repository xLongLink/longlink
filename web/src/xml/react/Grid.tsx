import { Grid as GridShell } from '@ui/grid';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Grid component. */
export interface GridProps {
    children?: ASTNode[];
    columns?: string | number;
}

/** Renders a full-width grid row. */
export function Grid({ children, columns }: GridProps) {
    const { ctx } = useXmlContext();

    return (
        <GridShell columns={columns == null ? undefined : String(columns)}>{renderNode(children ?? [], ctx)}</GridShell>
    );
}
