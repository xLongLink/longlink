import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML ul bridge component. */
export interface UlProps {
    children?: ASTNode[];
}

/** Renders an unordered list with typographic defaults. */
export function Ul({ children }: UlProps) {
    const { ctx } = useXmlContext();

    return <ul className="ml-6 list-disc space-y-2">{renderNode(children ?? [], ctx)}</ul>;
}
