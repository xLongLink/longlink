import { useState, type ReactNode } from 'react';
import { RuntimeProvider, useRuntime } from '../runtime';
import { renderNode } from '../renderers';

/**
 * Declares a scoped reactive state variable identified by `id`.
 *
 * All remaining props become the initial value of the state object, so
 * `<State id="filter" value="month">` initialises `filter` as `{ value: "month" }`.
 *
 * The state is exposed to descendants via `ctx.state[id]` as a
 * `[currentValue, setter]` tuple, matching React's useState shape.
 */
export function State({
    id,
    __xmlChildren,
    children,
    ...initialState
}: {
    id?: string;
    __xmlChildren?: unknown;
    children?: ReactNode;
    [key: string]: unknown;
}) {
    if (!id) {
        throw new Error('State requires an "id" parameter');
    }

    const runtime = useRuntime();
    const { ctx } = runtime;
    const [value, setValue] = useState(initialState);

    /* Register this state in context as a [value, setter] tuple */
    const childCtx = {
        ...ctx,
        state: {
            ...ctx.state,
            [id]: [value, setValue] as [any, Function],
        },
    };

    return (
        <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>
            {__xmlChildren ? renderNode(__xmlChildren as any, runtime.registry, childCtx) : children}
        </RuntimeProvider>
    );
}
