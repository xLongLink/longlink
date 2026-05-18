import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML h2 bridge component. */
export interface H2Props {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders a secondary heading with typographic defaults. */
export function H2({ children, className }: H2Props) {
    const { ctx } = useXmlContext();

    return (
        <h2
            className={['scroll-m-20 mt-8 mb-3 text-3xl font-semibold tracking-tight first:mt-0', className]
                .filter(Boolean)
                .join(' ')}
        >
            {renderNode(children ?? null, ctx)}
        </h2>
    );
}
