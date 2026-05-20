import { proxy } from 'valtio';
import type { ExecutionContext } from '../types';

/** Initializes a local reactive state slot for descendant XML nodes. */
export function state(ctx: ExecutionContext, id: string, value: unknown): void {
    ctx.values[id] = proxy(value as Record<string, unknown>);
}
