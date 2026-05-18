import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h3 bridge component. */
export interface H3Props {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders a tertiary heading with typographic defaults. */
export function H3({ children, className }: H3Props) {
    const { ctx } = useXmlContext();

    return (
        <h3
            className={['scroll-m-20 mt-6 mb-2 text-2xl font-semibold tracking-tight', className]
                .filter(Boolean)
                .join(' ')}
        >
            {renderNode(children ?? null, ctx)}
        </h3>
    );
}
