import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Stack component. */
export interface StackProps {
    children?: ASTNode | ASTNode[] | null;
    className?: string;
}

/** Renders children in a vertical stack. */
export function Stack({ children, className }: StackProps) {
    const { ctx } = useXmlContext();

    return (
        <div data-slot="stack" className={['flex w-full flex-col gap-4', className].filter(Boolean).join(' ')}>
            {renderNode(children ?? null, ctx)}
        </div>
    );
}
