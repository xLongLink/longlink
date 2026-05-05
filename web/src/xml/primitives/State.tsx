import { RuntimeProvider, renderNode, useRuntime } from '@/xml';
import { useState, type ReactNode } from 'react';

/** Creates a local reactive state slot for descendant XML nodes. */
export function State({
    id,
    children,
    ...initialState
}: {
    id?: string;
    children?: ReactNode;
    [key: string]: unknown;
}) {
    if (!id) throw new Error('State requires an "id" parameter');

    const runtime = useRuntime();
    const { registry, ctx } = runtime;
    const [value, setValue] = useState(initialState);
    const childCtx = { ...ctx, state: { ...ctx.state, [id]: [value, setValue] as [any, Function] } };

    return (
        <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>
            {renderNode(children as any, registry, childCtx)}
        </RuntimeProvider>
    );
}
