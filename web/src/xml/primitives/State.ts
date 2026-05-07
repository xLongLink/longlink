import { proxy } from 'valtio';
import type { ExecutionContext } from '../types';

/** Props accepted by the XML State component. */
export interface StateProps {
    id: string;
    value?: unknown;
}

/** Initializes a local reactive state slot for descendant XML nodes. */
export function State(ctx: ExecutionContext, { id, value }: StateProps): void {
    const values = ctx.values ?? (ctx.values = {});

    if (values[id] != null) return;

    /* Preserve object state shapes so descendants can read fields directly. */
    const initialValue = value != null && typeof value === 'object' && !Array.isArray(value) ? value : { value };

    values[id] = proxy(initialValue as Record<string, unknown>);
}
