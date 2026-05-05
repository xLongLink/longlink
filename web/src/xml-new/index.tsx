import { useQuery } from '@tanstack/react-query';
import React from 'react';

/*
 * XML-new is a compact XML runtime for this web layer.
 * It parses XML nodes into React elements, evaluates attributes against a flat
 * local context, and lets primitives like <State>, <Query>, and <For> extend
 * that context by cloning and adding new keys.
 *
 * Evaluation works in two stages: literals and `$name` values are resolved
 * directly, while `{...}` expressions are executed against the current context.
 * The entire runtime stays in one file so the component model, evaluation rules,
 * and renderer behavior stay aligned.
 */
export type XmlNode = {
    tagName: string;
    attributes: Record<string, string>;
    children?: XmlNode[];
};

export type StateCell<T = unknown> = {
    value: T;
    set: (next: T) => void;
};

export type XmlContext = Record<string, StateCell>;

export type XmlComponentProps = {
    props: Record<string, string>;
    children?: XmlNode[];
};

const XmlContextValue = React.createContext<XmlContext | null>(null);
const SIMPLE_EXPR_REGEX = /^[a-zA-Z0-9_.$\s+\-/*%!=<>|&(),?:'"\[\]]+$/;

function run(expr: string, ctx: XmlContext): unknown {
    const proxy = new Proxy(ctx, {
        get(target, prop: string) {
            const cell = target[prop];
            return cell ? cell.value : undefined;
        },
    });

    return new Function('ctx', `with (ctx) { return (${expr}); }`)(proxy);
}

function evaluate(value: string, context: XmlContext): unknown {
    const input = value.trim();
    if (input === '') return '';

    if (input.startsWith('$')) {
        const key = input.slice(1).trim();
        const cell = key ? context[key] : undefined;
        return cell ? cell.value : '';
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
                return String(evaluated ?? '');
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
    const context = React.useMemo<XmlContext>(() => ({}), []);

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

    const [cellValue, setCellValue] = React.useState<Record<string, unknown>>(value);
    const nextContext: XmlContext = {
        ...parent,
        [id]: {
            value: cellValue,
            set: (next: unknown) => {
                setCellValue(next as Record<string, unknown>);
            },
        },
    };

    return <Context value={nextContext}>{renderXml(children ?? [])}</Context>;
}

/** Fetches JSON into a state slot. */
function Query({ props, children }: XmlComponentProps) {
    const parent = useContext();
    const id = String(evaluate(props.id ?? '', parent) ?? '');
    const path = String(evaluate(props.path ?? '', parent) ?? '');

    const { data } = useQuery({
        queryKey: [id, path],
        queryFn: async () => {
            const response = await fetch(path);
            return response.json() as Promise<unknown>;
        },
        enabled: Boolean(id && path),
    });

    const nextContext: XmlContext = {
        ...parent,
        [id]: {
            value: data,
            set: () => {
                throw new Error('Query state is read-only');
            },
        },
    };

    return <Context value={nextContext}>{renderXml(children ?? [])}</Context>;
}

/** Renders a controlled input bound to state. */
function Input({ props }: XmlComponentProps) {
    const context = useContext();
    const rawValue = props.value ?? '';

    if (rawValue.trim().startsWith('$')) {
        const key = rawValue.trim().slice(1).trim();
        const cell = key ? context[key] : undefined;

        if (!cell) return null;

        return (
            <input
                value={String(cell.value ?? '')}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => cell.set(event.target.value)}
            />
        );
    }

    const evaluatedValue = evaluate(rawValue, context);
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

    const action = String(evaluate(props.action ?? '', context) ?? '');
    const method = String(evaluate(props.method ?? 'POST', context) ?? 'POST');
    const payload = evaluate(props.payload ?? '', context);

    const onClick = async () => {
        const body = payload ? JSON.stringify(payload) : undefined;
        if (!action) return;

        await fetch(action, {
            method,
            body,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
        });
    };

    return <button onClick={onClick}>{renderXml(children ?? [])}</button>;
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
                const nextContext: XmlContext = {
                    ...context,
                    [as]: {
                        value: item,
                        set: () => {
                            throw new Error('Cannot set value inside <For>');
                        },
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
function Text({ props }: XmlComponentProps) {
    if (!props.value) throw new Error('Text component requires a value prop');

    const context = useContext();
    const value = String(evaluate(props.value, context));

    return <>{value}</>;
}
