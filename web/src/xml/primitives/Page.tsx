import { renderNode, useRuntime } from '@/xml';
import { createElement, useEffect, type ReactNode } from 'react';

type PageProps = { title?: string; name?: string; children?: ReactNode };

/** Renders the page shell and updates the document title. */
export function Page({ title, name, children }: PageProps) {
    const { registry, ctx } = useRuntime();
    const documentTitle = title ?? name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) document.title = documentTitle;
    }, [documentTitle]);

    return createElement('div', { className: 'space-y-6' }, renderNode(children as any, registry, ctx));
}

export default Page;
