import type { XMLComponent } from '@xml';
import { renderNode, useContext } from '@xml';

/** Props accepted by the XML Page component. */
export interface PageProps {
    name?: string;
    icon?: string;
    children?: unknown;
}

/** Renders the page shell. */
export const Page: XMLComponent<PageProps> = ({ children }) => {
    const { ctx } = useContext();

    return <div className="space-y-6">{renderNode(children, ctx)}</div>;
};
