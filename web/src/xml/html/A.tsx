import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML anchor bridge component. */
export interface AProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
    href?: string;
}

/** Renders a linked anchor with standard styling. */
export function A({ children, className, href = '' }: AProps) {
    const { ctx } = useXmlContext();

    return (
        <a className={className} href={href}>
            {renderNode(children ?? null, ctx)}
        </a>
    );
}
