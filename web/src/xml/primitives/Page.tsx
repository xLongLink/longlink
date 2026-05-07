import type { XMLComponent } from '@/xml';
import { renderNode } from '@/xml';
import { useEffect } from 'react';

/** Props accepted by the XML Page component. */
export interface PageProps {
    title?: unknown;
    children?: unknown;
}

/** Renders the page shell and updates the document title. */
export const Page: XMLComponent<PageProps> = ({ props, children }) => {
    const { title } = props;
    const titleText = String(title ?? '');

    useEffect(() => {
        if (titleText.trim()) document.title = titleText;
    }, [titleText]);

    return <div className="space-y-6">{renderNode(children)}</div>;
};
