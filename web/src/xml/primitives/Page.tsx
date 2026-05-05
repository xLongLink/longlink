import type { RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import { useEffect } from 'react';

type PageProps = { title?: string; name?: string; children?: RenderableASTNode };

/** Renders the page shell and updates the document title. */
export function Page({ title, name, children }: PageProps) {
    const { ctx } = useRuntime();
    const documentTitle = title ?? name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) document.title = documentTitle;
    }, [documentTitle]);

    return <div className="space-y-6">{renderNode(children, ctx)}</div>;
}
