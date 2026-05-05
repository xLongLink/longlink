import type { XmlComponentProps } from '@/xml';
import { evaluate, renderXml } from '@/xml';
import { useEffect } from 'react';

/** Renders the page shell and updates the document title. */
export function Page({ props: rawProps, children }: XmlComponentProps) {
    const title = String(evaluate(rawProps.title ?? '', {}) ?? '');
    const name = String(evaluate(rawProps.name ?? '', {}) ?? '');
    const documentTitle = title || name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) document.title = documentTitle;
    }, [documentTitle]);

    return <div className="space-y-6">{renderXml(children)}</div>;
}
