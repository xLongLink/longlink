import { Component, Fragment, useContext as useReactContext, type ComponentType, type ReactNode } from 'react';
import { registry } from './registry';
import { BaseUrlContext, evaluate, RuntimeContext, RuntimeProvider } from './runtime';
import type { ASTNode, ExecutionContext, RenderableASTNode } from './types';

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
 * - Nodes whose `if` param evaluates to false are skipped.
 * - Component lookup is performed against the registry; unknown tags throw.
 * - Context is read from the nearest RuntimeProvider.
 */
export function renderXml(node: RenderableASTNode): ReactNode {
    if (!node) return <></>;

    return (
        <XmlErrorBoundary resetKey={node}>
            <RenderedNode node={node} />
        </XmlErrorBoundary>
    );
}

/** Renders a node after the XML error boundary is already mounted. */
function RenderedNode({ node }: { node: RenderableASTNode }): ReactNode {
    const runtime = useReactContext(RuntimeContext);
    const activeCtx: ExecutionContext = runtime ?? {};

    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;

    // Arrays of nodes are rendered as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderXml(child)}</Fragment>);
    }

    // Nodes with a falsy `if` param are not rendered at all.
    if (node.params?.if != null && !Boolean(evaluate(node.params.if, activeCtx))) {
        return <></>;
    }

    // Look up the component for this node's tag name in the registry.
    const Component = (registry as Record<string, ComponentType<any>>)[node.name];
    if (!Component) throw new Error(`Unknown component "${node.name}"`);

    return <Component props={node.params ?? {}} children={node.children} />;
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext, baseUrl: string): ReactNode {
    return (
        <XmlErrorBoundary resetKey={ast}>
            <BaseUrlContext.Provider value={baseUrl}>
                <RuntimeProvider value={ctx}>{renderXml(ast)}</RuntimeProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}
