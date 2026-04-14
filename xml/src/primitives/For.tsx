import { Fragment, type ReactNode } from 'react';
import { evaluate } from '../runtime/evaluate';
import { RuntimeProvider, useRuntime } from '../runtime/useRuntime';

export function For({ each, as, children }: { each?: string; as?: string; children?: ReactNode }) {
    if (!each) {
        throw new Error('For requires an "each" parameter');
    }

    if (!as) {
        throw new Error('For requires an "as" parameter');
    }

    const runtime = useRuntime();
    const { ctx } = runtime;
    const items = evaluate(each, ctx);

    if (!Array.isArray(items)) {
        return null;
    }

    return items.map((item, index) => {
        const childCtx = {
            ...ctx,
            scope: {
                ...ctx.scope,
                [as]: item,
                $index: index,
            },
        };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={{ ...runtime, ctx: childCtx }}>{children}</RuntimeProvider>
            </Fragment>
        );
    });
}
