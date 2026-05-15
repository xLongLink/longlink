import type { ExpressionResolver } from './types';

import { evaluate } from './evaluate';

/** Compiles an XML expression into a function evaluated later with ctx. */
export function compile(expr: string): ExpressionResolver {
    return (ctx) => evaluate(expr, ctx);
}
