import type { XmlComponentProps } from '@/xml';
import { RuntimeProvider, evaluate, renderXml, useContext } from '@/xml';
import { useRef, useState } from 'react';

/** Creates a local reactive state slot for descendant XML nodes. */
export function State({ props, children }: XmlComponentProps) {
    const { ctx, states } = useContext();
    if (props.id == null || props.id === '') throw new Error('State requires an "id" parameter');

    const id = String(evaluate(props.id, ctx) ?? '');

    /* Create one reactive object and expose it through a stable proxy. */
    const [stateValue, setStateValue] = useState(() =>
        Object.fromEntries(
            Object.entries(props)
                .filter(([key]) => key !== 'id')
                .map(([key, val]) => [key, evaluate(val, ctx)])
        )
    );
    const stateDataRef = useRef(stateValue);
    stateDataRef.current = stateValue;
    const stateRef = useRef<Record<string, unknown> | null>(null);
    if (stateRef.current == null) {
        stateRef.current = new Proxy({} as Record<string, unknown>, {
            get(_target, key) {
                return stateDataRef.current[key as string];
            },
            set(_target, key, value) {
                const field = String(key);
                setStateValue((current) => ({ ...current, [field]: value }));
                return true;
            },
            ownKeys() {
                return Reflect.ownKeys(stateDataRef.current);
            },
            getOwnPropertyDescriptor() {
                return { enumerable: true, configurable: true };
            },
        });
    }

    const childStates = { ...(states ?? {}), [id]: stateRef.current };
    const childCtx = { ...ctx, [id]: stateValue, __xmlStates: childStates };

    return (
        <RuntimeProvider value={{ ctx: childCtx, states: childStates, props, children }}>
            {renderXml(children)}
        </RuntimeProvider>
    );
}
