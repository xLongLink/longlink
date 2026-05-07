import type { XMLComponent } from '@/xml';
import { renderNode } from '@/xml';
import { useEffect } from 'react';

/** Props accepted by the XML Page component. */
export interface PageProps {
    name?: string;
    title?: unknown;
    icon?: string;
    children?: unknown;
}

/** Renders the page shell and updates the document title. */
export const Page: XMLComponent<PageProps> = ({ title, children }) => {
    const titleText = String(title ?? '');

    useEffect(() => {
        if (titleText.trim()) document.title = titleText;
    }, [titleText]);

    return <div className="space-y-6">{renderNode(children)}</div>;
};
