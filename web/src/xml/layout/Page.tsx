import { createElement, useEffect, type ReactNode } from 'react';

type PageProps = {
    title?: string;
    name?: string;
    children?: ReactNode;
};

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
