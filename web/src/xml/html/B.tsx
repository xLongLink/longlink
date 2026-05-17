import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML b bridge component. */
export interface BProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders bold text. */
export function B({ children, className }: BProps) {
    const { ctx } = useXmlContext();

    return <b className={className}>{renderNode(children ?? null, ctx)}</b>;
}
