import type { ASTNode, RenderableASTNode, XMLComponent } from '@xml';
import { renderNode, useContext } from '@xml';

/** Props accepted by the XML paragraph bridge component. */
export interface PProps {
    children?: RenderableASTNode | string | number | boolean;
}

/** Renders a paragraph with standard styling. */
export const P: XMLComponent<PProps> = ({ children }) => {
    const { ctx } = useContext();
    const content: RenderableASTNode =
        typeof children === 'string' || typeof children === 'number' || typeof children === 'boolean'
            ? ({ name: 'Text', params: { value: String(children) } } satisfies ASTNode)
            : (children ?? null);

    return <p className="leading-7 [&:not(:first-child)]:mt-6">{renderNode(content, ctx)}</p>;
};
