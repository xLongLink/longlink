import { proxy } from 'valtio';
import type { ExecutionContext } from '../types';
import { isSafePropertyName } from '../expressions';

/** Initializes a local reactive state slot for descendant XML nodes. */
export function state(ctx: ExecutionContext, id: string, value: unknown): void {
    // Reject unsafe state identifiers before creating a proxy slot.
    if (!isSafePropertyName(id)) {
        throw new Error('State id must be a safe property name');
    }

    ctx.values[id] = proxy(value as Record<string, unknown>);
}
