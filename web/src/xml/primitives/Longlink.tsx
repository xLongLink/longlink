import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Longlink component. */
export interface LonglinkProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Renders the root shell. */
export function Longlink({ children }: LonglinkProps) {
    const { ctx } = useXmlContext();

    return <div className="space-y-6">{renderNode(children ?? null, ctx)}</div>;
}
