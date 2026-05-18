import { Grid as GridShell } from '@ui/grid';
import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Grid component. */
export interface GridProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    templateColumns?: string | number;
}

/** Renders a full-width grid row. */
export function Grid({ children, className, templateColumns }: GridProps) {
    const { ctx } = useXmlContext();

    return (
        <GridShell
            className={className}
            templateColumns={templateColumns == null ? undefined : String(templateColumns)}
        >
            {renderNode(children ?? null, ctx)}
        </GridShell>
    );
}
