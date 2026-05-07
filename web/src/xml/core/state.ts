import type { ExecutionContext } from '@xml/types';
import { proxy } from 'valtio';

/** Initializes a local reactive state slot for descendant XML nodes. */
export function state(ctx: ExecutionContext, id: string, value: string | number | unknown[]): void {
    const values = ctx.values ?? (ctx.values = {});

    /* Keep primitive values as-is and proxy lists for reactive updates. */
    const initialValue = Array.isArray(value) ? value : { value };

    values[id] = proxy<Record<string, unknown>>(initialValue as Record<string, unknown>);
}
