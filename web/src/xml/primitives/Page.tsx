import type { ASTNode, RenderableASTNode, XMLComponent } from '@xml';
import { renderNode, useContext } from '@xml';

/** Props accepted by the XML Page component. */
export interface PageProps {
    name?: string;
    icon?: string;
    children?: RenderableASTNode | string | number | boolean;
}

/** Renders the page shell. */
export const Page: XMLComponent<PageProps> = ({ children }) => {
    const { ctx } = useContext();
    const content: RenderableASTNode =
        typeof children === 'string' || typeof children === 'number' || typeof children === 'boolean'
            ? ({ name: 'Text', params: { value: String(children) } } satisfies ASTNode)
            : (children ?? null);

    return <div className="space-y-6">{renderNode(content, ctx)}</div>;
};
