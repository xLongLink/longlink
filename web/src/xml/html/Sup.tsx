import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML sup bridge component. */
export interface SupProps {
    children?: ASTNode[];
    className?: string;
}

/** Renders superscript text. */
export function Sup({ children, className: _className }: SupProps) {
    const { ctx } = useXmlContext();

    return <sup>{renderNode(children ?? [], ctx)}</sup>;
}
