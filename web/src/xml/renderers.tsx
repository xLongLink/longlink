import { Fragment, useContext as useReactContext, type ReactNode } from 'react';
import { XmlErrorBoundary } from './errors';
import { evaluate } from './expressions';
import { registry } from './registry';
import { BaseUrlContext, RuntimeContext, RuntimeProvider } from './runtime';
import type { ASTNode, ExecutionContext, RenderableASTNode } from './types';

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
    const ctx: ExecutionContext = runtime ?? { values: {} };

    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;
    if (typeof node === 'string' || typeof node === 'number') return node;
    if (typeof node === 'boolean') return <></>;

    let rendered: ReactNode;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null && !Boolean(evaluate(node.params.if, ctx))) {
        return <></>;
    }

    const Component = registry[node.name];
    if (!Component) throw new Error(`Unknown component "${node.name}"`);

    rendered = <Component props={(node.params ?? {}, ctx, node.name)} children={node.children} />;

    return <XmlErrorBoundary resetKey={node}>{rendered}</XmlErrorBoundary>;
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext, baseUrl = ''): ReactNode {
    return (
        <XmlErrorBoundary resetKey={ast}>
            <BaseUrlContext.Provider value={baseUrl}>
                <RuntimeProvider value={ctx}>{renderNode(ast)}</RuntimeProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}

/** Backwards-compatible alias for callers that still import renderXml. */
export function renderXml(node: RenderableASTNode, _ctx: ExecutionContext = { values: {} }, _baseUrl = ''): ReactNode {
    return renderNode(node);
}
