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
 * Example:
 *   Input:
 *     { name: 'Button', params: { if: 'true' }, children: [{ name: 'Text', params: { text: 'Save' } }] }
 *   Output:
 *     <Button><Text text="Save" /></Button>
 */
export function renderNode(node: RenderableASTNode): ReactNode {
    const runtime = useReactContext(RuntimeContext);
    const activeCtx: ExecutionContext = runtime ?? { values: {} };

    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;

    let rendered: ReactNode;

    // Arrays of nodes are rendered as fragments with stable keys.
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
export function render(ast: ASTNode[], ctx: ExecutionContext, baseUrl: string): ReactNode {
    return (
        <XmlErrorBoundary resetKey={ast}>
            <BaseUrlContext.Provider value={baseUrl}>
                <RuntimeProvider value={ctx}>{renderNode(ast)}</RuntimeProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}
