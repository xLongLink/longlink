import { Component, Fragment, useContext as useReactContext, type ComponentType, type ReactNode } from 'react';
import { registry } from './registry';
import { evaluate, resolveBinding, resolveCondition, RuntimeContext, RuntimeProvider } from './runtime';
import type { ASTNode, ExecutionContext, RenderableASTNode, RuntimeOptions, SetterContext } from './types';

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
 * Resolves XML attributes into React props for a rendered node.
 */
function resolveParams(params: ASTNode['params'], ctx: ExecutionContext): Record<string, unknown> {
    if (!params) return {};

    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
        if (key === 'if') continue;

        if (typeof value === 'string' && value.startsWith('$')) {
            try {
                const binding = resolveBinding(
                    value.slice(1),
                    ctx,
                    (ctx.__xmlSetters as SetterContext | undefined) ?? {}
                );
                resolved[key] = binding.value;
                resolved[toChangeHandlerName(key)] = binding.setValue;
            } catch {
                resolved[key] = evaluate(value, ctx);
            }
            continue;
        }

        resolved[key] = evaluate(value, ctx);
    }

    return resolved;
}

/** Converts a bound prop name into the React-style change callback name. */
function toChangeHandlerName(propName: string): string {
    if (propName === 'value' || propName === 'checked' || propName === 'active') {
        return 'onChange';
    }

    return `on${propName.charAt(0).toUpperCase()}${propName.slice(1)}Change`;
}

/**
 * Renders XML AST nodes with the current runtime context.
 *
 * - Text nodes are resolved through the same `{expression}` rule and returned as strings.
 * - Nodes whose `if` param evaluates to false are skipped.
 * - Component lookup is performed against the registry; unknown tags throw.
 * - Context is read from the nearest RuntimeProvider.
 */
export function renderXml(node: RenderableASTNode): ReactNode {
    if (!node) return null;

    if (typeof node === 'string') return node;

    return (
        <XmlErrorBoundary resetKey={node}>
            <RenderedNode node={node} />
        </XmlErrorBoundary>
    );
}

/** Renders a node after the XML error boundary is already mounted. */
function RenderedNode({ node }: { node: RenderableASTNode }): ReactNode {
    const runtime = useReactContext(RuntimeContext);
    const activeCtx = runtime?.ctx ?? {};

    if (!node) return null;

    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderXml(child)}</Fragment>);
    }

    if (node.name === 'Text') {
        if (typeof node.children === 'string') {
            const value = evaluate(node.children, activeCtx);

            if (isRenderableValue(value)) return value;

            throw new Error(
                `XML text expression resolved to ${describeValue(value)}, which cannot be rendered as text`
            );
        }

        return renderXml(node.children);
    }

    if (!resolveCondition(node.params?.if, activeCtx)) {
        return null;
    }

    const component = (registry as Record<string, ComponentType<any>>)[node.name];

    if (!component) {
        throw new Error(`Unknown component "${node.name}"`);
    }

    const Component = component;
    const resolvedProps = resolveParams(node.params, activeCtx);

    return <Component props={resolvedProps} children={node.children} />;
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext, options?: RuntimeOptions): ReactNode {
    return (
        <XmlErrorBoundary resetKey={ast}>
            <RuntimeProvider value={{ ctx, options, props: {}, children: ast }}>{renderXml(ast)}</RuntimeProvider>
        </XmlErrorBoundary>
    );
}

/** Returns true when an evaluated XML text value is safe for React to render. */
function isRenderableValue(value: unknown): value is ReactNode {
    return value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/** Describes a value that cannot be rendered directly. */
function describeValue(value: unknown): string {
    if (Array.isArray(value)) return 'an array';
    if (value === null) return 'null';
    return typeof value === 'object' ? 'an object' : typeof value;
}
