import { evaluate } from './evaluate';
import { resolveValue } from './resolveValue';
import type { ExecutionContext } from '../types';

export function resolveCondition(condition: string | undefined, ctx: ExecutionContext): boolean {
    if (condition == null) return true;

    const trimmed = condition.trim();

    if (!trimmed) return false;

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return Boolean(resolveValue(trimmed, ctx));
    }

    return Boolean(evaluate(trimmed, ctx));
}
