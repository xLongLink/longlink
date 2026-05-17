import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sup bridge component. */
export interface SupProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders superscript text. */
export function Sup({ children, className }: SupProps) {
    const { ctx } = useXmlContext();

    return <sup className={className}>{renderNode(children ?? null, ctx)}</sup>;
}
