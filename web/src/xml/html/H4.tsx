import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h4 bridge component. */
export interface H4Props {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders a quaternary heading with typographic defaults. */
export function H4({ children, className }: H4Props) {
    const { ctx } = useXmlContext();

    return (
        <h4 className={['scroll-m-20 text-xl font-semibold tracking-tight', className].filter(Boolean).join(' ')}>
            {renderNode(children ?? null, ctx)}
        </h4>
    );
}
