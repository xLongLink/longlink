import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML anchor bridge component. */
export interface AProps {
    children?: ASTNode[];
    active?: 'always' | 'hover';
    href?: string;
}

/** Renders a linked anchor with standard styling. */
export function A({ children, active = 'hover', href }: AProps) {
    const { ctx } = useXmlContext();
    const linkClassName =
        active === 'always'
            ? 'inline-flex items-center gap-1 text-accent underline underline-offset-4 hover:opacity-80'
            : 'inline-flex items-center gap-1 text-foreground underline underline-offset-4 transition-colors hover:text-accent hover:opacity-80';

    return (
        <a className={linkClassName} {...(href ? { href } : {})}>
            {renderNode(children ?? [], ctx)}
        </a>
    );
}
