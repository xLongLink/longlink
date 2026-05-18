import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Stack component. */
export interface StackProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders children in a vertical stack. */
export function Stack({ children, className: _className }: StackProps) {
    const { ctx } = useXmlContext();

    return <div data-slot="stack">{renderNode(children ?? [], ctx)}</div>;
}
