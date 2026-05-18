import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML code bridge component. */
export interface CodeProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders inline code with monospace typography defaults. */
export function Code({ children, className: _className }: CodeProps) {
    const { ctx } = useXmlContext();

    return <code>{renderNode(children ?? [], ctx)}</code>;
}
