import type { RenderableASTNode } from '@/xml';
import { RuntimeProvider, evaluate, renderNode, useContext } from '@/xml';
import { useState } from 'react';

/** Creates a local reactive state slot for descendant XML nodes. */
export function State({ props, children }: { props: Record<string, string>; children?: RenderableASTNode }) {
    const context = useContext();
    const id = evaluate(props.id ?? '', context, 'string');
    if (!id) throw new Error('State requires an "id" parameter');

    const initialState = Object.fromEntries(Object.entries(props).filter(([key]) => key !== 'id'));
    const [value, setValue] = useState(initialState);
    const childCtx = { ...context.ctx, state: { ...context.ctx.state, [id]: [value, setValue] as [any, Function] } };

    return (
        <RuntimeProvider value={{ ...context, ctx: childCtx, props, children }}>
            {renderNode(children, childCtx)}
        </RuntimeProvider>
    );
}
