import type { ExecutionContext } from '@xml/types';
import { proxy } from 'valtio';

/** Initializes a local reactive state slot for descendant XML nodes. */
export function state(ctx: ExecutionContext, id: string, value: string | number | unknown[]): void {
    /* Keep primitive values as-is and proxy lists for reactive updates. */
    const initialValue = Array.isArray(value) ? value : { value };

    ctx.values[id] = proxy<Record<string, unknown>>(initialValue as Record<string, unknown>);
}
