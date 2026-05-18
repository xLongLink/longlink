import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML anchor bridge component. */
export interface AProps {
    children?: ASTNode[];
    href?: string;
}

/** Renders a linked anchor with standard styling. */
export function A({ children, href = '' }: AProps) {
    const { ctx } = useXmlContext();

    return <a href={href}>{renderNode(children ?? [], ctx)}</a>;
}
