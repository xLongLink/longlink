import { proxy } from 'valtio';
import type { ExecutionContext } from '../types';

/** Initializes a local reactive state slot for descendant XML nodes. */
export function state(ctx: ExecutionContext, id: string, value: unknown): void {
    /* Proxy arrays and objects directly; wrap primitives in a reactive scalar slot. */
    const initialValue = Array.isArray(value) || (value !== null && typeof value === 'object') ? value : { value };

    ctx.values[id] = proxy(initialValue as Record<string, unknown>);
}
