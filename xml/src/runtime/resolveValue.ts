import { evaluate } from './evaluate';
import { interpolate } from './interpolate';
import type { ExecutionContext } from '../types';

export function resolveValue(value: string, ctx: ExecutionContext): unknown {
    if (!value.startsWith('{') || !value.endsWith('}')) {
        return interpolate(value, ctx);
    }

    const expression = value.slice(1, -1).trim();

    try {
        return evaluate(expression, ctx);
    } catch (error) {
        if (!(error instanceof SyntaxError)) {
            throw error;
        }
    }

    return evaluate(`(${value})`, ctx);
}
