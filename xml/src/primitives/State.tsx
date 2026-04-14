import { useState, type ReactNode } from 'react';
import { RuntimeProvider, useRuntime } from '../runtime/useRuntime';

export function State({
    id,
    children,
    ...initialState
}: {
    id?: string;
    children?: ReactNode;
    [key: string]: unknown;
}) {
    if (!id) {
        throw new Error('State requires an "id" parameter');
    }

    const runtime = useRuntime();
    const { ctx } = runtime;
    const [value, setValue] = useState(initialState);

    const childCtx = {
        ...ctx,
        state: {
            ...ctx.state,
            [id]: [value, setValue] as [any, Function],
        },
    };

    return <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>{children}</RuntimeProvider>;
}
