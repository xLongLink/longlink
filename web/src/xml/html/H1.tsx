import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h1 bridge component. */
export interface H1Props {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders a primary heading with typographic defaults. */
export function H1({ children, className }: H1Props) {
    const { ctx } = useXmlContext();

    return (
        <h1
            className={['scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance', className]
                .filter(Boolean)
                .join(' ')}
        >
            {renderNode(children ?? null, ctx)}
        </h1>
    );
}
