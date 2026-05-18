import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Longlink component. */
export interface LonglinkProps {
    children: ASTNode[];
}

/** Renders the root shell. */
export function Longlink({ children }: LonglinkProps) {
    const { ctx } = useXmlContext();

    return <div>{renderNode(children, ctx)}</div>;
}
