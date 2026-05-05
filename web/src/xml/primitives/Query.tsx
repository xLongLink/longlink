import type { RenderableASTNode } from '@/xml';
import { RuntimeProvider, renderNode, useRuntime } from '@/xml';
import { useQuery } from '@tanstack/react-query';

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query({
    id,
    path: pathTemplate,
    children,
}: {
    id?: string;
    path?: string;
    children?: RenderableASTNode;
}) {
    if (!id) throw new Error('Query requires an "id" parameter');
    if (!pathTemplate) throw new Error('Query requires a "path" parameter');

    const runtime = useRuntime();
    const { registry, ctx } = runtime;
    const path = pathTemplate;
    const baseUrl = ctx.baseUrl ?? '';
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const { data } = useQuery({
        queryKey: [id, url],
        queryFn: async () => {
            const response = await fetch(url);
            return response.json();
        },
    });

    const childCtx = { ...ctx, queries: { ...ctx.queries, [id]: data } };

    return (
        <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>
            {renderNode(children, registry, childCtx)}
        </RuntimeProvider>
    );
}
