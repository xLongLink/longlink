import type { ExecutionContext } from '../types';

export function evaluate(expr: string, ctx: ExecutionContext): any {
    const scope = {
        ...Object.fromEntries(Object.entries(ctx.state).map(([key, [value]]) => [key, value])),
        ...ctx.queries,
        ...ctx.scope,
    };

    return new Function(...Object.keys(scope), `return ${expr}`)(...Object.values(scope));
}
