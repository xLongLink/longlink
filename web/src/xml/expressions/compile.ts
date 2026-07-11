import type { ExpressionResolver } from './types';
import { evaluate, prepareEvaluation } from './evaluate';

/** Compiles an XML expression into a function evaluated later with ctx. */
export function compile(expr: string): ExpressionResolver {
    prepareEvaluation(expr);

    return (ctx) => evaluate(expr, ctx);
}
