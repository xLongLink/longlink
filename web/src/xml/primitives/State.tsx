import type { XmlComponentProps } from '@/xml';
import { RuntimeProvider, evaluate, renderXml, useContext } from '@/xml';
import { useRef } from 'react';
import { proxy } from 'valtio';
import { useSnapshot } from 'valtio/react';

/** Creates a local reactive state slot for descendant XML nodes. */
export function State({ props, children }: XmlComponentProps) {
    const { ctx } = useContext();
    if (props.id == null || props.id === '') throw new Error('State requires an "id" parameter');

    const id = String(evaluate(props.id, ctx) ?? '');

    /* Create one Valtio proxy and keep it stable for descendants. */
    const stateRef = useRef<Record<string, unknown> | null>(null);
    if (stateRef.current == null) {
        stateRef.current = proxy(
            Object.fromEntries(
                Object.entries(props)
                    .filter(([key]) => key !== 'id')
                    .map(([key, val]) => [key, evaluate(val, ctx)])
            ) as Record<string, unknown>
        );
    }

    const stateValue = useSnapshot(stateRef.current);

    const childCtx = {
        parent: ctx,
        values: {
            [id]: stateValue,
        },
    };

    return <RuntimeProvider value={childCtx}>{renderXml(children)}</RuntimeProvider>;
}
