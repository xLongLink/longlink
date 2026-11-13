import type { ReactNode } from 'react';

/** View adapters provide render callbacks, not component types; calling them preserves keyed child state. */
export function renderGridContent<TContext>(
    content: ReactNode | ((context: TContext) => ReactNode),
    context: TContext
) {
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- TanStack templates are either content or a render callback.
    return typeof content === 'function' ? content(context) : content;
}
