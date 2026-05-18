import { Grid as GridShell } from '@ui/grid';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Grid component. */
export interface GridProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    columns?: string | number;
}

/** Renders a full-width grid row. */
export function Grid({ children, className, columns }: GridProps) {
    const { ctx } = useXmlContext();

    return (
        <GridShell className={className} columns={columns == null ? undefined : String(columns)}>
            {renderNode(children ?? null, ctx)}
        </GridShell>
    );
}
