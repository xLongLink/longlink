import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sup bridge component. */
export interface SupProps {
    children?: ASTNode[];
}

/** Renders superscript text. */
export function Sup({ children }: SupProps) {
    const { ctx } = useXmlContext();

    return <sup className="text-[0.8em]">{renderNode(children ?? [], ctx)}</sup>;
}
