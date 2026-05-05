import type { XmlComponentProps } from '@/xml';
import { renderXml, useProps } from '@/xml';
import { useEffect } from 'react';

/** Renders the page shell and updates the document title. */
export function Page({ props: rawProps, children }: XmlComponentProps) {
    const props = useProps(rawProps as Record<string, string>);
    const title = String(props.title ?? '');
    const name = String(props.name ?? '');
    const documentTitle = title || name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) document.title = documentTitle;
    }, [documentTitle]);

    return <div className="space-y-6">{renderXml(children)}</div>;
}
