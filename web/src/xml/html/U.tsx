import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML u bridge component. */
export interface UProps {
    children?: ASTNode[];
}

/** Renders underlined text. */
export function U({ children }: UProps) {
    const { ctx } = useXmlContext();

    return <u className="underline underline-offset-4">{renderNode(children ?? [], ctx)}</u>;
}
