import { renderNode } from '@/xml';
import { useEffect } from 'react';

/** Props accepted by the XML Page component. */
export interface PageProps {
    title?: unknown;
}

/** Renders the page shell and updates the document title. */
export function Page({ props: rawProps, children }: { props: PageProps; children?: unknown }) {
    const title = String(rawProps.title ?? '');

    useEffect(() => {
        if (title.trim()) document.title = title;
    }, [title]);

    return <div className="space-y-6">{renderNode(children)}</div>;
}
