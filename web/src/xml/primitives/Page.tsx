import type { XMLComponent } from '@/xml';
import { renderNode } from '@/xml';

/** Props accepted by the XML Page component. */
export interface PageProps {
    name?: string;
    icon?: string;
    children?: unknown;
}

/** Renders the page shell. */
export const Page: XMLComponent<PageProps> = ({ children }) => {
    return <div className="space-y-6">{renderNode(children)}</div>;
};
