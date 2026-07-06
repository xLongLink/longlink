import { proxy } from 'valtio';
import { isSafePropertyName } from '../expressions';
import type { ExecutionContext } from '../types';

/** Initializes a local reactive state slot for descendant XML nodes. */
export function state(ctx: ExecutionContext, id: string, value: unknown): void {
    if (!isSafePropertyName(id)) {
        throw new Error('State id must be a safe property name');
    }

    ctx.values[id] = proxy(value as Record<string, unknown>);
}
