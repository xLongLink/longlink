import type { XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import { useEffect } from 'react';

/** Renders the page shell and updates the document title. */
export function Page({ props: rawProps, children }: XmlComponentProps) {
    const title = String(rawProps.title ?? '') ?? '';

    useEffect(() => {
        if (title.trim()) document.title = title;
    }, [title]);

    return <div className="space-y-6">{renderXml(children)}</div>;
}
