import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';

/*
 * XML-new is a compact XML runtime for the web layer.
 * It turns parsed XML nodes into React elements, evaluates attributes against
 * a flat value context, and keeps writes separate through a matching setter
 * context.
 *
 * `State` stores local scalar state and exposes it through both contexts.
 * `Query` reads remote JSON with React Query and publishes the result as read-
 * only data, while `Input` and `Button` use setters and mutations for writes.
 * `For` adds scoped loop values, and `XmlErrorBoundary` keeps runtime failures
 * from crashing the entire tree.
 *
 * Evaluation supports plain literals, `$name` lookups, and `{...}` expressions
 * executed against the current context, so XML attributes can stay declarative
 * while still referencing live values.
 */
export type XmlNode = {
    tagName: string;
    attributes: Record<string, string>;
    children?: XmlNode[];
};

export type XmlContext = Record<string, unknown>;

export type XmlSetters = Record<string, (value: unknown) => void>;

export type XmlComponentProps = {
    props: Record<string, string>;
    children?: XmlNode[];
};

const ValueContext = React.createContext<XmlContext>({});
const SetterContext = React.createContext<XmlSetters>({});
const REGISTRY: Record<string, React.ComponentType<XmlComponentProps>> = {
    State,
    Query,
    Input,
    Button,
    For,
    Text,
};

type ErrorBoundaryProps = {
    children: React.ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
    message: string;
};

class XmlErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, message: '' };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, message: error.message || 'XML rendering failed' };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {this.state.message}
                </div>
            );
        }

        return this.props.children;
    }
}

function safeEval(expr: string, ctx: XmlContext): unknown {
    return new Function('ctx', `with (ctx) { return (${expr}); }`)(ctx);
}

function evaluate(value: string, context: XmlContext): unknown {
    const input = value.trim();
    if (input === '') return '';

    if (input.startsWith('$')) {
        const key = input.slice(1).trim();
        return key ? (context[key] ?? '') : '';
    }

    if (input.startsWith('{') && input.endsWith('}')) {
        return safeEval(input.slice(1, -1), context);
    }

    if (input.includes('{')) {
        return input.replace(/\{([^}]+)\}/g, (_, expr) => {
            try {
                const result = safeEval(expr, context);
                return String(result ?? '');
            } catch {
                return '';
            }
        });
    }

    const numeric = Number(input);
    if (!Number.isNaN(numeric) && String(numeric) === input) {
        return numeric;
    }

    return value;
}

/** Provides the root XML context for a page. */
function StoreProvider({ children }: { children: React.ReactNode }) {
    const values = React.useRef<XmlContext>({}).current;
    const setters = React.useRef<XmlSetters>({}).current;

    return (
        <ValueContext.Provider value={values}>
            <SetterContext.Provider value={setters}>{children}</SetterContext.Provider>
        </ValueContext.Provider>
    );
}

/** Returns the nearest XML evaluation context. */
function useValueContext(): XmlContext {
    return React.useContext(ValueContext);
}

/** Wraps children in a nested XML context layer. */
function Context({ value, children }: { value: XmlContext; children: React.ReactNode }) {
    return <ValueContext.Provider value={value}>{children}</ValueContext.Provider>;
}

/** Renders XML AST nodes into React elements. */
function renderXml(nodes: XmlNode[]): React.ReactNode {
    return nodes.map((node) => renderNode(node));
}

/** Renders a single XML node into a React element. */
function renderNode(node: XmlNode): React.ReactNode {
    const Component = REGISTRY[node.tagName] ?? node.tagName;
    return React.createElement(Component as React.ElementType, { props: node.attributes, children: node.children });
}

/** Declares a local state slot. */
function State({ props, children }: XmlComponentProps) {
    const values = React.useContext(ValueContext);
    const parentSetters = React.useContext(SetterContext);
    const id = String(props.id ?? '');
    const initial = React.useMemo(() => evaluate(props.value ?? '', values), [props.value, values]);
    const [state, setState] = React.useState(initial);

    React.useEffect(() => {
        setState(initial);
    }, [initial]);

    /* Keep the derived context stable unless its inputs change. */
    const nextValueContext = React.useMemo(() => ({ ...values, [id]: state }), [values, id, state]);
    const nextSetterContext = React.useMemo(
        () => ({ ...parentSetters, [id]: setState }),
        [parentSetters, id, setState]
    );

    return (
        <ValueContext.Provider value={nextValueContext}>
            <SetterContext.Provider value={nextSetterContext}>
                <XmlErrorBoundary>{renderXml(children ?? [])}</XmlErrorBoundary>
            </SetterContext.Provider>
        </ValueContext.Provider>
    );
}

/** Fetches JSON into a state slot. */
function Query({ props, children }: XmlComponentProps) {
    const parent = useValueContext();
    const id = String(evaluate(props.id ?? '', parent) ?? '');
    const path = String(evaluate(props.path ?? '', parent) ?? '');

    const { data, error } = useQuery({
        queryKey: [id, path],
        queryFn: async () => {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            return response.json() as Promise<unknown>;
        },
        enabled: Boolean(id && path),
    });

    React.useEffect(() => {
        if (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load query data');
        }
    }, [error]);

    /* Memoize the derived query context to avoid unnecessary tree churn. */
    const nextContext = React.useMemo(() => ({ ...parent, [id]: data }), [parent, id, data]);

    return (
        <Context value={nextContext}>
            <XmlErrorBoundary>{renderXml(children ?? [])}</XmlErrorBoundary>
        </Context>
    );
}

/** Renders a controlled input bound to state. */
function Input({ props }: XmlComponentProps) {
    const context = useValueContext();
    const setters = React.useContext(SetterContext);
    const rawValue = props.value ?? '';

    if (rawValue.trim().startsWith('$')) {
        const key = rawValue.trim().slice(1).trim();
        const cell = key ? context[key] : undefined;
        const value = cell ?? '';

        return (
            <input
                value={String(value)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setters[key]?.(event.target.value)}
            />
        );
    }

    return <input value={String(evaluate(rawValue, context) ?? '')} readOnly />;
}

/** Triggers an HTTP request when clicked. */
function Button({ props, children }: XmlComponentProps) {
    const context = useValueContext();
    const queryClient = useQueryClient();

    const action = String(evaluate(props.action ?? '', context) ?? '');
    const method = String(evaluate(props.method ?? 'POST', context) ?? 'POST');
    const payload = evaluate(props.payload ?? '', context);
    const invalidate = props.invalidate
        ? String(evaluate(props.invalidate, context))
              .split(',')
              .map((key) => key.trim())
              .filter(Boolean)
        : [];

    const mutation = useMutation({
        mutationFn: async () => {
            if (!action) return;

            const body = payload ? JSON.stringify(payload) : undefined;

            const response = await fetch(action, {
                method,
                body,
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            return response.json().catch(() => null);
        },
        onSuccess: () => {
            invalidate.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: [key] });
            });
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Request failed');
        },
    });

    return (
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <XmlErrorBoundary>{renderXml(children ?? [])}</XmlErrorBoundary>
        </button>
    );
}

/** Iterates over a list and renders scoped children. */
function For({ props, children }: XmlComponentProps) {
    if (!props.as) throw new Error('For component requires an as prop');
    if (!props.each) throw new Error('For component requires an each prop');

    const context = useValueContext();
    const each = evaluate(props.each, context);
    const as = String(props.as);

    if (!Array.isArray(each) || !as) return null;

    return (
        <>
            {each.map((item, index) => {
                const nextContext = { ...context, [as]: item };

                return (
                    <Context key={index} value={nextContext}>
                        <XmlErrorBoundary>{renderXml(children ?? [])}</XmlErrorBoundary>
                    </Context>
                );
            })}
        </>
    );
}

/** Renders plain text with expression interpolation. */
function Text({ props }: XmlComponentProps) {
    if (!props.value) throw new Error('Text component requires a value prop');

    const context = useValueContext();
    const value = String(evaluate(props.value, context));

    return <>{value}</>;
}
