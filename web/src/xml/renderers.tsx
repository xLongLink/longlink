import { Component, Fragment, type ComponentType, type ReactNode } from 'react';
import { registry } from './registry';
import { evaluate, resolveBinding, resolveCondition, RuntimeProvider } from './runtime';
import type { ASTNode, ExecutionContext, RenderableASTNode, SetterContext } from './types';

type XmlErrorBoundaryProps = {
    children: ReactNode;
    resetKey?: unknown;
    source?: RenderableASTNode;
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
                    {this.props.source ? (
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded border border-destructive/30 bg-background/80 p-3 font-mono text-xs text-foreground">
                            {formatXmlTree(this.props.source)}
                        </pre>
                    ) : null}
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
 * Renders a single ASTNode (or array/null) into React elements.
 *
 * - Text nodes are resolved through the same `{expression}` rule and returned as strings.
 * - Nodes whose `if` param evaluates to false are skipped.
 * - Component lookup is performed against the registry; unknown tags throw.
 * - Each rendered element is wrapped in a RuntimeProvider so child primitives
 *   and `<RuntimeChildren />` can access the current node, registry, and context.
 */
export function renderNode(node: RenderableASTNode, ctx: ExecutionContext): ReactNode {
    if (!node) return null;

    return (
        <XmlErrorBoundary resetKey={node} source={node}>
            <RenderedNode node={node} ctx={ctx} />
        </XmlErrorBoundary>
    );
}

/** Renders a node after the XML error boundary is already mounted. */
function RenderedNode({ node, ctx }: { node: RenderableASTNode; ctx: ExecutionContext }): ReactNode {
    if (!node) return null;

    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, ctx)}</Fragment>);
    }

    if (node.name === 'text') {
        if (!node.value) return null;

        const value = evaluate(node.value, ctx);

        if (isRenderableValue(value)) return value;

        throw new Error(`XML text expression resolved to ${describeValue(value)}, which cannot be rendered as text`);
    }

    if (!resolveCondition(node.params?.if, ctx)) {
        return null;
    }

    const component = (registry as Record<string, ComponentType<any>>)[node.name];

    if (!component) {
        throw new Error(`Unknown component "${node.name}"`);
    }

    const Component = component;
    const resolvedProps = resolveParams(node.params, ctx);

    return (
        <RuntimeProvider value={{ ctx, props: resolvedProps, children: node.children }}>
            <Component props={resolvedProps} children={node.children} />
        </RuntimeProvider>
    );
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext): ReactNode {
    return (
        <XmlErrorBoundary resetKey={ast} source={ast}>
            {ast.map((node, index) => (
                <Fragment key={index}>{renderNode(node, ctx)}</Fragment>
            ))}
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

/** Formats the failing AST node as readable XML for the error fallback. */
function formatXmlTree(node: RenderableASTNode): string {
    if (!node) return '';
    if (Array.isArray(node)) return node.map((child) => formatXmlNode(child, 0)).join('\n');

    return formatXmlNode(node, 0);
}

/** Formats one AST node and its descendants as XML. */
function formatXmlNode(node: ASTNode, depth: number): string {
    const indent = '  '.repeat(depth);

    if (node.name === 'text') {
        return `${indent}${node.value ?? ''}`;
    }

    const attributes = formatAttributes(node.params);
    const children = node.children ?? [];

    if (children.length === 0) {
        return `${indent}<${node.name}${attributes} />`;
    }

    return [
        `${indent}<${node.name}${attributes}>`,
        ...children.map((child) => formatXmlNode(child, depth + 1)),
        `${indent}</${node.name}>`,
    ].join('\n');
}

/** Formats XML attributes with escaped values. */
function formatAttributes(params: ASTNode['params']): string {
    if (!params) return '';

    return Object.entries(params)
        .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
        .join('');
}

/** Escapes an attribute value for display in the XML error tree. */
function escapeAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
