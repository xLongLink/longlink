import type { RenderableASTNode } from '@/xml';
import { evaluate, renderNode, useContext } from '@/xml';
import { useEffect } from 'react';

type PageProps = { title?: string; name?: string; children?: RenderableASTNode };

/** Renders the page shell and updates the document title. */
export function Page({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const title = evaluate(props.title ?? '', context, 'string');
    const name = evaluate(props.name ?? '', context, 'string');
    const documentTitle = title || name;

    useEffect(() => {
        if (typeof documentTitle === 'string' && documentTitle.trim()) document.title = documentTitle;
    }, [documentTitle]);

    return <div className="space-y-6">{renderNode(children, context.ctx)}</div>;
}
