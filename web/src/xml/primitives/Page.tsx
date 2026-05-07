import type { ASTNode, XMLComponent } from '@xml';
import { renderNode, useContext } from '@xml';

/** Props accepted by the XML Page component. */
export interface PageProps {
    name?: string;
    icon?: string;
    children?: ASTNode | ASTNode[] | null;
}

/** Renders the page shell. */
export const Page: XMLComponent<PageProps> = ({ children }) => {
    const { ctx } = useContext();

    return <div className="space-y-6">{renderNode(children ?? null, ctx)}</div>;
};
