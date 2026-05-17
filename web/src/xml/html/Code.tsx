import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML code bridge component. */
export interface CodeProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders inline code with monospace typography defaults. */
export function Code({ children, className }: CodeProps) {
    const { ctx } = useXmlContext();

    return (
        <code
            className={['relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold', className]
                .filter(Boolean)
                .join(' ')}
        >
            {renderNode(children ?? null, ctx)}
        </code>
    );
}
