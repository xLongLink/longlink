import type { ExecutionContext } from '@xml/types';
import { proxy } from 'valtio';

/** Props accepted by the XML State component. */
export interface StateProps {
    id: string;
    value: string | number | unknown[];
}

/** Initializes a local reactive state slot for descendant XML nodes. */
export function state(ctx: ExecutionContext, { id, value }: StateProps): void {
    const values = ctx.values ?? (ctx.values = {});

    if (values[id] != null) return;

    /* Keep primitive values as-is and proxy lists for reactive updates. */
    const initialValue = Array.isArray(value) ? value : { value };

    values[id] = proxy<Record<string, unknown>>(initialValue as Record<string, unknown>);
}
