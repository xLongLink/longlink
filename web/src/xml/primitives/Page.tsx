import type { ASTNode } from '@xml';
import { renderNode, useXmlContext } from '@xml';

/** Props accepted by the XML Page component. */
export interface PageProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Renders the page shell. */
export function Page({ children }: PageProps) {
    const { ctx } = useXmlContext();

    return <div className="space-y-6">{renderNode(children ?? null, ctx)}</div>;
}
