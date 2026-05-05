import React from 'react';
import { evaluate } from './evaluate';
import { renderXml } from './renderer';
import { Context, useContext } from './store';
import type { XmlComponentProps, XmlContext } from './types';

/** Declares a local state slot. */
export function State({ props, children }: XmlComponentProps) {
    const parent = useContext();
    const id = String(evaluate(props.id ?? '', parent) ?? '');
    const value = Object.fromEntries(
        Object.entries(props)
            .filter(([key]) => key !== 'id')
            .map(([key, raw]) => [key, evaluate(raw, parent)])
    );

    const nextContext: XmlContext = {
        store: parent.store,
        scope: {
            ...parent.scope,
            [id]: value,
        },
    };

    return <Context value={nextContext}>{renderXml(children ?? [])}</Context>;
}

/** Fetches JSON into a state slot. */
export function Query({ props }: XmlComponentProps) {
    const parent = useContext();
    const [data, setData] = React.useState<any>(null);
    const id = String(evaluate(props.id ?? '', parent) ?? '');
    const path = String(evaluate(props.path ?? '', parent) ?? '');

    React.useEffect(() => {
        if (!id || !path) return;
        void fetch(path)
            .then((res) => res.json())
            .then((result) => setData(result && typeof result === 'object' ? result : { value: result }));
    }, [id, path]);

    const nextContext: XmlContext = {
        store: parent.store,
        scope: {
            ...parent.scope,
            [id]: data,
        },
    };

    return <Context value={nextContext}>{renderXml(children ?? [])}</Context>;
}

/** 
 * Renders a controlled input bound to state. 
 * <Input value="example" /> for a static value
 * <Input value="{stateValue}" /> for a an expression
 * <State id="sample" value="initial" placeholder="Enter text"> 
 *   <Input value="$sample.value" placeholder="sample.placeholder" />
 * </State>

 */
export function Input({ props }: XmlComponentProps) {
    const context = useContext();

    const rawValue = String(props.value ?? '');
    const isBound = rawValue.startsWith('$');
    const value = isBound
        ? String(evaluate(`{${rawValue.slice(1)}}`, context) ?? '')
        : String(evaluate(rawValue, context) ?? '');

    return <input value={value} onChange={() => undefined} />;
}

/** Triggers an HTTP request when clicked. */
export function Button({ props, children }: XmlComponentProps) {
    const context = useContext();

    const action = evaluate(props.action ?? '', context);
    const method = String(evaluate(props.method ?? 'POST', context) ?? 'POST');
    const payload = evaluate(props.payload ?? '', context);

    const onClick = async () => {
        const body = payload ? JSON.stringify(payload) : undefined;
        await fetch(action ?? '', {
            method,
            body,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
        });
    };

    return <button onClick={onClick}>{renderXml(children ?? [], context)}</button>;
}

/** Iterates over a list and renders scoped children. */
export function For({ props, children }: XmlComponentProps) {
    if (!props.as) throw new Error('For component requires an as prop');
    if (!props.each) throw new Error('For component requires an each prop');
    const context = useContext();
    const each = evaluate(props.each, context);
    const as = String(props.as);

    if (!Array.isArray(each) || !as) return null;

    return (
        <>
            {each.map((item, index) => {
                const nextContext: XmlContext = {
                    store: context.store,
                    scope: {
                        ...context.scope,
                        [as]: item,
                    },
                };

                return (
                    <Context key={index} value={nextContext}>
                        {renderXml(children ?? [])}
                    </Context>
                );
            })}
        </>
    );
}

/** Renders plain text with expression interpolation. */
export function Text({ props }: XmlComponentProps) {
    // Check props
    if (!props.value) throw new Error('Text component requires a value prop');

    const context = useContext();
    const value = String(evaluate(props.value, context));

    return <>{value}</>;
}
