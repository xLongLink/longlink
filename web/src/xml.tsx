import { Button as UIButton } from '@/ui/button';
import { Input as UIInput } from '@/ui/input';
import { useQuery } from '@tanstack/react-query';
import { XMLParser } from 'fast-xml-parser';
import {
    Component,
    Fragment,
    createContext,
    useEffect,
    useMemo,
    useContext as useReactContext,
    useRef,
    type ComponentType,
    type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { proxy } from 'valtio';
import { useSnapshot } from 'valtio/react';

/** A single node in the XML abstract syntax tree produced by the compiler. */
export type ASTNode = {
    name: string;
    params?: Record<string, string>;
    children?: RenderableASTNode;
};

/** XML runtime scope with lexical parent lookup. */
export type ExecutionContext = Record<string, unknown> & {
    parent?: ExecutionContext;
    values?: Record<string, unknown>;
};

/** Legacy runtime wrapper shape accepted by RuntimeProvider. */
export type RuntimeState = {
    children?: RenderableASTNode;
    ctx: ExecutionContext;
    props: Record<string, unknown>;
};

/** A React component that can be registered and rendered from XML. */
export type RegistryComponent<Props = Record<string, unknown>> = ComponentType<Props>;

/** A node, text value, or array of nodes that can be rendered by renderNode. */
export type RenderableASTNode = ASTNode | ASTNode[] | string | null | undefined;

/** Standard XML component contract used by the runtime. */
export type XmlComponentProps = {
    props: Record<string, string>;
    children?: RenderableASTNode;
};

/** XML component type with the runtime contract. */
export type XmlRegistryComponent<Props = Record<string, unknown>> = ComponentType<Props & XmlComponentProps>;

/** Shared parser instance configured to keep XML values as strings. */
const parser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: ':@',
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
});

export const BaseUrlContext = createContext<string>('');
export const RuntimeContext = createContext<ExecutionContext | RuntimeState | null>(null);

/** Parses an XML string into an array of ASTNodes. */
export function xmlToAST(xml: string): ASTNode[] {
    return toNodes(parser.parse(xml));
}

/** Alias used by page renderers when compiling XML strings. */
export const fromXml = xmlToAST;

/** Converts parser output into XML AST nodes. */
function toNodes(input: unknown, tagName?: string): ASTNode[] {
    /* Arrays are flattened so repeated sibling tags become sibling AST nodes. */
    if (Array.isArray(input)) {
        return input.flatMap((item) => toNodes(item, tagName));
    }

    if (tagName) {
        const params: Record<string, string> = {};
        const children: ASTNode[] = [];

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            const attributes = (input as Record<string, unknown>)[':@'];

            /* Parser-grouped attributes keep string children distinct from string params. */
            if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
                for (const [key, entry] of Object.entries(attributes)) {
                    if (typeof entry === 'string') {
                        params[key.replace(/^@_/, '')] = entry;
                    }
                }
            }

            /* Element body entries become text nodes or nested XML elements. */
            for (const [key, entry] of Object.entries(input as Record<string, unknown>)) {
                if (key === ':@') {
                    continue;
                } else if (key === '#text') {
                    children.push(...toNodes(entry));
                } else {
                    children.push(...toNodes(entry, key));
                }
            }
        }

        return [
            {
                name: tagName,
                ...(Object.keys(params).length > 0 && { params }),
                ...(children.length > 0 && { children }),
            },
        ];
    }

    if (!input) return [];

    /* Primitive parser values become text nodes when they contain visible content. */
    if (typeof input === 'string') {
        return input.trim() ? [{ name: 'Text', params: { text: input } }] : [];
    }

    if (typeof input !== 'object') return [];

    /* Root objects are expanded into their top-level XML elements. */
    return Object.entries(input).flatMap(([key, value]) => {
        if (key.startsWith('?') || key.startsWith('!')) return [];

        if (key === '#text') {
            return toNodes(value);
        }

        return toNodes(value, key);
    });
}

/** Resolves a value from the current XML runtime scope chain. */
export function resolve(ctx: ExecutionContext | null | undefined, key: string): unknown {
    if (!ctx) return undefined;

    const values = ctx.values ?? ctx;

    if (key in values) {
        return values[key];
    }

    return resolve(ctx.parent, key);
}

/** Evaluates an XML attribute value against the current XML runtime scope. */
export function evaluate(expr: string, ctx: ExecutionContext): unknown {
    const input = expr.trim();
    const values = createScopeProxy(ctx);

    if (input === '') return '';

    if (input.startsWith('{') || input.startsWith('[')) {
        try {
            return JSON.parse(input, (_key, value: unknown) => {
                if (typeof value !== 'string') return value;

                const expressionMatch = value.match(/^\{([^{}]+)\}$/);
                if (expressionMatch) return runExpression(expressionMatch[1]!, values);

                return value.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
                    String(runExpression(expression, values) ?? '')
                );
            });
        } catch {
            // JSON attributes may contain string placeholders such as "{issue.title}".
        }

        try {
            const interpolated = input.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
                String(runExpression(expression, values) ?? '')
            );

            return JSON.parse(interpolated);
        } catch {
            // Fall through so malformed JSON can still be handled as a literal string.
        }
    }

    if (input.startsWith('{') && input.endsWith('}')) {
        const expression = input.slice(1, -1).trim();
        const expressionValue = /^[A-Za-z_$][\w$]*\s*:/.test(expression) ? input : expression;

        return runExpression(expressionValue, values);
    }

    if (input.includes('{')) {
        return expr.replace(/\{([^}]+)\}/g, (_match, expression: string) =>
            String(runExpression(expression, values) ?? '')
        );
    }

    if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*$/.test(input)) {
        try {
            const value = runExpression(input, values);

            if (value !== undefined) return value;
        } catch {
            // Plain strings such as State value="day" should stay literal when no binding exists.
        }
    }

    return expr;
}

/** Provides XML runtime scope to a rendered subtree. */
export function RuntimeProvider({ value, children }: { value: ExecutionContext | RuntimeState; children: ReactNode }) {
    return <RuntimeContext.Provider value={normalizeContext(value)}>{children}</RuntimeContext.Provider>;
}

/** Returns the active XML runtime state. */
export function useContext(): { ctx: ExecutionContext } {
    const runtime = useReactContext(RuntimeContext);

    if (!runtime) {
        throw new Error('useContext must be used inside a rendered XML component');
    }

    return { ctx: normalizeContext(runtime) };
}

/** Resolves a request URL against the active base URL. */
export function useUrl(path: string): string {
    const baseUrl = useReactContext(BaseUrlContext);

    if (!path) return baseUrl;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!baseUrl) return path;

    return `${baseUrl}${path}`;
}

/** Runs an expression with XML values exposed as local variables. */
function runExpression(expression: string, values: Record<string, unknown>): unknown {
    return new Function('ctx', `with (ctx) { return (${expression}); }`)(values);
}

/** Creates a proxy that resolves identifiers through lexical parent contexts. */
function createScopeProxy(ctx: ExecutionContext): Record<string, unknown> {
    const normalizedCtx = normalizeContext(ctx);

    return new Proxy(
        {},
        {
            has(_target, key) {
                return typeof key === 'string' ? resolve(normalizedCtx, key) !== undefined : false;
            },
            get(_target, key) {
                return typeof key === 'string' ? resolve(normalizedCtx, key) : undefined;
            },
        }
    );
}

/** Normalizes supported context shapes into the lexical context model. */
function normalizeContext(ctx: ExecutionContext | RuntimeState): ExecutionContext {
    if ('ctx' in ctx && ctx.ctx && typeof ctx.ctx === 'object') {
        return normalizeContext(ctx.ctx as ExecutionContext);
    }

    if ('values' in ctx && ctx.values) return ctx as ExecutionContext;

    return { values: ctx as Record<string, unknown> };
}

/** Renders the page shell and updates the document title. */
export function Page({ props: rawProps, children }: XmlComponentProps) {
    const title = String(rawProps.title ?? '') ?? '';

    useEffect(() => {
        if (title.trim()) document.title = title;
    }, [title]);

    return <div className="space-y-6">{renderNode(children)}</div>;
}

/** Iterates over an array and renders children in a scoped context. */
export function For({ props, children }: XmlComponentProps) {
    const { ctx } = useContext();
    if (props.as == null || props.as === '') throw new Error('For requires an "as" parameter');
    if (props.each == null || props.each === '') throw new Error('For requires an "each" parameter');

    const each = evaluate(props.each, ctx);
    const as = String(evaluate(props.as, ctx) ?? '');

    if (!Array.isArray(each)) return null;

    return each.map((item, index) => {
        const childCtx = {
            parent: ctx,
            values: {
                [as]: item,
                index,
            },
        };

        return (
            <Fragment key={index}>
                <RuntimeProvider value={childCtx}>{renderNode(children)}</RuntimeProvider>
            </Fragment>
        );
    });
}

/** Fetches JSON data into a reusable query slot for descendants. */
export function Query({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();
    const id = String(evaluate(rawProps.id ?? '', ctx) ?? '');
    const pathTemplate = String(evaluate(rawProps.path ?? '', ctx) ?? '');
    if (!id) throw new Error('Query requires an "id" parameter');
    if (!pathTemplate) throw new Error('Query requires a "path" parameter');

    const url = useUrl(pathTemplate);
    const { data, error } = useQuery({
        queryKey: [id, url],
        queryFn: async () => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

            return response.json();
        },
        enabled: Boolean(id && url),
    });

    useEffect(() => {
        if (error) toast.error(error instanceof Error ? error.message : 'Failed to load query data');
    }, [error]);

    const childCtx = useMemo(
        () => ({
            parent: ctx,
            values: {
                [id]: data ?? {},
            },
        }),
        [ctx, id, data]
    );
    return <RuntimeProvider value={childCtx}>{renderNode(children)}</RuntimeProvider>;
}

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

    return <RuntimeProvider value={childCtx}>{renderNode(children)}</RuntimeProvider>;
}

/** Renders XML text content through the standard XML renderer. */
export function Text({ props: rawProps }: XmlComponentProps) {
    const { ctx } = useContext();

    const raw = rawProps.text ?? rawProps.value;

    if (typeof raw !== 'string') return null;

    const value = evaluate(raw, ctx);

    if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    throw new Error(
        `XML text expression resolved to ${Array.isArray(value) ? 'an array' : typeof value}, which cannot be rendered as text`
    );
}

/** Renders a paragraph with standard styling. */
export function P({ children }: XmlComponentProps) {
    return <p className="leading-7 [&:not(:first-child)]:mt-6">{renderNode(children)}</p>;
}

/** XML button adapter that maps action-layer props to DOM-safe button props. */
export function Button({ props: rawProps, children }: XmlComponentProps) {
    const { ctx } = useContext();

    const action = String(evaluate(rawProps.action ?? '', ctx) ?? '');
    const json = evaluate(rawProps.json ?? '', ctx);
    const requestUrl = useUrl(action);

    /** Sends the configured request and shows a minimal toast result. */
    async function handleClick() {
        if (!action) return;

        const response = await fetch(requestUrl, {
            method: 'POST',
            body: JSON.stringify(json),
            headers: { 'content-type': 'application/json' },
        });

        if (!response.ok) {
            toast.error(`Request failed with status ${response.status}`);
            return;
        }

        toast.success(`Request completed with status ${response.status}`);
    }

    return <UIButton onClick={handleClick}>{renderNode(children)}</UIButton>;
}

/** Renders a minimal XML input control. */
export function Input({ props }: XmlComponentProps) {
    const { ctx } = useContext();
    const valueProp = props.value ?? '';
    const placeholder = String(evaluate(props.placeholder ?? '', ctx) ?? '');
    const value = String(evaluate(valueProp, ctx) ?? '');

    return <UIInput type="text" placeholder={placeholder} value={value} readOnly />;
}

/* Build the built-in XML component registry once at module load. */
export const registry = {
    Page,
    Query,
    State,
    Text,
    For,
    Button,
    Input,
    p: P,
};

type XmlErrorBoundaryProps = {
    children: ReactNode;
    resetKey?: unknown;
};

type XmlErrorBoundaryState = {
    error: Error | null;
};

/** Keeps XML rendering failures scoped to the XML surface. */
class XmlErrorBoundary extends Component<XmlErrorBoundaryProps, XmlErrorBoundaryState> {
    state: XmlErrorBoundaryState = { error: null };

    /** Stores the thrown error so the XML area can render the message. */
    static getDerivedStateFromError(error: Error): XmlErrorBoundaryState {
        return { error };
    }

    /** Clears a previous XML error when the rendered XML node changes. */
    componentDidUpdate(previousProps: XmlErrorBoundaryProps) {
        if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
            this.setState({ error: null });
        }
    }

    /** Renders the XML error message or the protected XML subtree. */
    render() {
        if (this.state.error) {
            return (
                <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <div className="font-medium">{this.state.error.message || 'XML rendering failed'}</div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Renders XML AST nodes with the current runtime context.
 *
 * Example:
 *   Input:
 *     { name: 'Button', params: { if: 'true' }, children: [{ name: 'Text', params: { text: 'Save' } }] }
 *   Output:
 *     <Button><Text text="Save" /></Button>
 */
export function renderNode(node: RenderableASTNode): ReactNode {
    const runtime = useReactContext(RuntimeContext);
    const activeCtx: ExecutionContext = runtime ? normalizeContext(runtime) : { values: {} };

    if (!node) return <></>;

    let rendered: ReactNode;

    if (Array.isArray(node)) {
        rendered = node.map((child, index) => <Fragment key={index}>{renderNode(child)}</Fragment>);
    } else if (node.params?.if != null && !Boolean(evaluate(node.params.if, activeCtx))) {
        rendered = <></>;
    } else {
        const Component = (registry as Record<string, ComponentType<any>>)[node.name];
        if (!Component) throw new Error(`Unknown component "${node.name}"`);

        rendered = <Component props={node.params ?? {}} children={node.children} />;
    }

    return <XmlErrorBoundary resetKey={node}>{rendered}</XmlErrorBoundary>;
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext = { values: {} }, baseUrl = ''): ReactNode {
    return (
        <XmlErrorBoundary resetKey={ast}>
            <BaseUrlContext.Provider value={baseUrl}>
                <RuntimeProvider value={ctx}>{renderNode(ast)}</RuntimeProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}
