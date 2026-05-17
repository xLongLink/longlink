import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ul bridge component. */
export interface UlProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders an unordered list with typographic defaults. */
export function Ul({ children, className }: UlProps) {
    const { ctx } = useXmlContext();

    return (
        <ul className={['my-6 ml-6 list-disc [&>li]:mt-2', className].filter(Boolean).join(' ')}>
            {renderNode(children ?? null, ctx)}
        </ul>
    );
}
