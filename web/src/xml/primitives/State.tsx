import type { XMLComponent } from '@/xml';
import { useContext } from '@/xml';
import { useRef } from 'react';
import { proxy } from 'valtio';
import { useSnapshot } from 'valtio/react';

/** Props accepted by the XML State component. */
export interface StateProps {
    id: string;
    value?: unknown;
}

/** Creates a local reactive state slot for descendant XML nodes. */
export const State: XMLComponent<StateProps> = ({ id, value }) => {
    const { ctx } = useContext();
    const values = ctx.values ?? (ctx.values = {});

    /* Create one Valtio proxy and keep it stable for descendants. */
    const stateRef = useRef<Record<string, unknown> | null>(null);
    if (stateRef.current == null) {
        stateRef.current = proxy({ value });
    }

    const stateValue = useSnapshot(stateRef.current);

    values[id] = stateValue;

    return null;
};
