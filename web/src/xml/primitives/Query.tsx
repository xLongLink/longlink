import type { RenderableASTNode } from '@/xml';
import { RuntimeProvider, evaluate, renderNode, useContext } from '@/xml';
import { useQuery } from '@tanstack/react-query';

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const id = evaluate(props.id ?? '', context, 'string');
    const pathTemplate = evaluate(props.path ?? '', context, 'string');
    if (!id) throw new Error('Query requires an "id" parameter');
    if (!pathTemplate) throw new Error('Query requires a "path" parameter');

    const path = pathTemplate;
    const baseUrl = context.ctx.baseUrl ?? '';
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const { data } = useQuery({
        queryKey: [id, url],
        queryFn: async () => {
            const response = await fetch(url);
            return response.json();
        },
    });

    const childCtx = { ...context.ctx, queries: { ...context.ctx.queries, [id]: data } };

    return (
        <RuntimeProvider value={{ ...context, ctx: childCtx, props, children }}>
            {renderNode(children, childCtx)}
        </RuntimeProvider>
    );
}
