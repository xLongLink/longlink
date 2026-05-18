import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ol bridge component. */
export interface OlProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders an ordered list with typographic defaults. */
export function Ol({ children, className }: OlProps) {
    const { ctx } = useXmlContext();

    return (
        <ol className={['my-6 ml-6 list-decimal [&>li]:mt-2', className].filter(Boolean).join(' ')}>
            {renderNode(children ?? null, ctx)}
        </ol>
    );
}
