import type { XmlComponentProps } from '@/xml';
import { RuntimeProvider, evaluate, renderXml, useContext } from '@/xml';
import { useMemo, useState } from 'react';

/** Creates a local reactive state slot for descendant XML nodes. */
export function State({ props: rawProps, children }: XmlComponentProps) {
    const { ctx, baseUrl, setters, props: contextProps, children } = useContext();
    const id = String(evaluate(rawProps.id ?? '', ctx) ?? '');
    if (!id) throw new Error('State requires an "id" parameter');

    const value = evaluate(rawProps.value ?? '', ctx);
    const resolvedProps = { id, value };
    const initialState = useMemo(() => {
        if (value !== undefined && value !== '') return value;

        return Object.fromEntries(
            Object.entries(rawProps)
                .filter(([key]) => key !== 'id' && key !== 'value')
                .map(([key, val]) => [key, evaluate(val, ctx)])
        );
    }, [value]);
    const [stateValue, setStateValue] = useState(initialState);
    const childSetters = useMemo(() => ({ ...(setters ?? {}), [id]: setStateValue }), [setters, id]);
    const childCtx = useMemo(
        () => ({ ...ctx, [id]: stateValue, __xmlSetters: childSetters }),
        [ctx, id, stateValue, childSetters]
    );

    return (
        <RuntimeProvider value={{ ctx: childCtx, baseUrl, setters: childSetters, props: resolvedProps, children }}>
            {renderXml(children)}
        </RuntimeProvider>
    );
}
