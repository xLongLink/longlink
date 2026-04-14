import { evaluate } from './evaluate';
import type { ExecutionContext } from '../types';

export function interpolate(str: string, ctx: ExecutionContext): string {
    return str.replace(/\{([^}]+)\}/g, (_, expr) => String(evaluate(expr, ctx)));
}
