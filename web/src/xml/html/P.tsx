import type { ASTNode } from '@xml';
import { renderNode, useContext } from '@xml';
import type { ComponentType } from 'react';

/** Props accepted by the XML paragraph bridge component. */
export interface PProps {
    children?: ASTNode | ASTNode[] | null;
}

/** Renders a paragraph with standard styling. */
export const P: ComponentType<PProps> = ({ children }) => {
    const { ctx } = useContext();

    return <p className="leading-7 [&:not(:first-child)]:mt-6">{renderNode(children ?? null, ctx)}</p>;
};
