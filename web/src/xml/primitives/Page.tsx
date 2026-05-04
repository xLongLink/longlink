import { createElement, useEffect, type ReactNode } from 'react';

type PageProps = {
    title?: string;
    name?: string;
    children?: ReactNode;
};

/** Renders a page container that sets the document title and wraps children. */
export function Page({ title, name, children }: PageProps) {
    const documentTitle = title ?? name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) {
            document.title = documentTitle;
        }
    }, [documentTitle]);

    return createElement('div', { className: 'space-y-6' }, children);
}

export default Page;
