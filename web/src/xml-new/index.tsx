import React from 'react';

export type XmlNode = {
    tagName: string;
    attributes: Record<string, string>;
    children?: XmlNode[];
};

export type XmlContext = Record<string, unknown>;

export type XmlComponentProps = {
    props: Record<string, string>;
    children?: XmlNode[];
};

const XmlContextValue = React.createContext<XmlContext | null>(null);
const SIMPLE_EXPR_REGEX = /^[a-zA-Z0-9_.$\s+\-/*%!=<>|&(),?:'"\[\]]+$/;

function run(expr: string, ctx: Record<string, unknown>): unknown {
    return new Function('ctx', `with (ctx) { return (${expr}); }`)(ctx);
}

function evaluate(value: string, context: XmlContext): unknown {
    const input = value.trim();
    if (input === '') return '';

    if (input.startsWith('$')) {
        const key = input.slice(1).trim();
        return key ? context[key] : '';
    }

    const ctx = context;
    const numeric = Number(input);
    if (!Number.isNaN(numeric) && String(numeric) === input) {
        return numeric;
    }

    if (input.includes('{')) {
        const result = input.replace(/\{([^}]+)\}/g, (_, expr) => {
            try {
                const evaluated = run(expr, ctx);
                return evaluated ?? '';
            } catch {
                return '';
            }
        });

        if (/^\{[^}]+\}$/.test(input)) {
            return run(input.slice(1, -1), ctx);
        }

        return result;
    }

    if (SIMPLE_EXPR_REGEX.test(input)) {
        try {
            return run(input, ctx);
        } catch {
            return value;
        }
    }

    return value;
}

/** Provides the root XML context for a page. */
function StoreProvider({ children }: { children: React.ReactNode }) {
    const context: XmlContext = {};

    return <XmlContextValue.Provider value={context}>{children}</XmlContextValue.Provider>;
}

/** Returns the nearest XML evaluation context. */
function useContext(): XmlContext {
    const ctx = React.useContext(XmlContextValue);

    if (!ctx) {
        throw new Error('useContext must be used inside StoreProvider');
    }

    return ctx;
}

/** Wraps children in a nested XML context layer. */
function Context({ value, children }: { value: XmlContext; children: React.ReactNode }) {
    return <XmlContextValue.Provider value={value}>{children}</XmlContextValue.Provider>;
}

/** Renders XML AST nodes into React elements. */
function renderXml(nodes: XmlNode[]): React.ReactNode {
    return nodes.map((node, index) => <React.Fragment key={index}>{renderNode(node)}</React.Fragment>);
}

/** Renders a single XML node into a React element. */
function renderNode(node: XmlNode): React.ReactNode {
    const registry: Record<string, React.ComponentType<XmlComponentProps>> = {
        State,
        Query,
        Input,
        Button,
        For,
        Text,
    };

    const Component = registry[node.tagName] ?? node.tagName;
    return React.createElement(Component as React.ElementType, { props: node.attributes, children: node.children });
}

/** Declares a local state slot. */
function State({ props, children }: XmlComponentProps) {
    const parent = useContext();
    const id = String(evaluate(props.id ?? '', parent) ?? '');
    const value: Record<string, unknown> = {};

    for (const [key, raw] of Object.entries(props)) {
        if (key === 'id') continue;
        value[key] = evaluate(raw, parent);
    }

    const nextContext: XmlContext = { ...parent, [id]: value };

    return <Context value={nextContext}>{renderXml(children ?? [])}</Context>;
}

/** Fetches JSON into a state slot. */
function Query({ props, children }: XmlComponentProps) {
    const parent = useContext();
    const [data, setData] = React.useState<unknown>(null);
    const id = String(evaluate(props.id ?? '', parent) ?? '');
    const path = String(evaluate(props.path ?? '', parent) ?? '');

    React.useEffect(() => {
        if (!id || !path) return;

        async function load() {
            const response = await fetch(path);
            const result: unknown = await response.json();
            setData(result && typeof result === 'object' ? result : { value: result });
        }

        void load();
    }, [id, path]);

    const nextContext: XmlContext = { ...parent, [id]: data };

    return <Context value={nextContext}>{renderXml(children ?? [])}</Context>;
}

/** Renders a controlled input bound to state. */
function Input({ props }: XmlComponentProps) {
    const context = useContext();
    const evaluatedValue = evaluate(props.value ?? '', context);
    const [currentValue, setCurrentValue] = React.useState(() => String(evaluatedValue ?? ''));

    React.useEffect(() => {
        setCurrentValue(String(evaluatedValue ?? ''));
    }, [evaluatedValue]);

    return (
        <input
            value={currentValue}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCurrentValue(event.target.value)}
        />
    );
}

/** Triggers an HTTP request when clicked. */
function Button({ props, children }: XmlComponentProps) {
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
function For({ props, children }: XmlComponentProps) {
    if (!props.as) throw new Error('For component requires an as prop');
    if (!props.each) throw new Error('For component requires an each prop');

    const context = useContext();
    const each = evaluate(props.each, context);
    const as = String(props.as);

    if (!Array.isArray(each) || !as) return null;

    return (
        <>
            {each.map((item, index) => {
                const nextContext: XmlContext = { ...context, [as]: item };

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
function Text({ props }: XmlComponentProps) {
    if (!props.value) throw new Error('Text component requires a value prop');

    const context = useContext();
    const value = String(evaluate(props.value, context));

    return <>{value}</>;
}
