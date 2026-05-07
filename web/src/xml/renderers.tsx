import { XmlErrorBoundary } from '@xml/errors';
import { compile, evaluate } from '@xml/expressions';
import { Query, type QueryProps } from '@xml/primitives/Query';
import { State, type StateProps } from '@xml/primitives/State';
import { registry } from '@xml/registry';
import { BaseUrlContext, RuntimeContext, RuntimeProvider } from '@xml/runtime';
import type { ASTNode, ExecutionContext, RenderableASTNode } from '@xml/types';
import { Fragment, Suspense, useContext as useReactContext, type ReactNode } from 'react';

/** Converts XML attribute strings into the React prop shape a component expects. */
function resolveParams(params: Record<string, string> | undefined, ctx: ExecutionContext): Record<string, unknown> {
    if (!params) return {};

    const resolved: Record<string, unknown> = {};

    /* Resolve eager values immediately and keep function-like props compiled for later use. */
    for (const [key, value] of Object.entries(params)) {
        if (key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
            resolved[key] = compile(value);
            continue;
        }

        resolved[key] = evaluate(value, ctx, { attributeName: key });
    }

    return resolved;
}

/**
 * Renders XML AST nodes with the current runtime context.
 *
 * Example:
 *   Input:
 *     { name: 'Button', params: { if: 'true' }, children: [{ name: 'Text', params: { value: 'Save' } }] }
 *   Output:
 *     <Button><Text value="Save" /></Button>
 */
function renderNodeWithContext(node: RenderableASTNode, ctx: ExecutionContext): ReactNode {
    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;
    if (typeof node === 'string' || typeof node === 'number') return node;
    if (typeof node === 'boolean') return <></>;

    let rendered: ReactNode;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNodeWithContext(child, ctx)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null) {
        if (!Boolean(evaluate(node.params.if, ctx, { nodeName: node.name, attributeName: 'if' }))) {
            return <></>;
        }
    }

    const resolved = resolveParams(node.params, ctx);

    if (node.name === 'State') {
        const id = resolved.id;
        if (typeof id !== 'string') {
            throw new Error('State requires a string id');
        }

        const stateProps: StateProps = { id, value: resolved.value };
        State(ctx, stateProps);
        return <></>;
    }

    if (node.name === 'Query') {
        const id = resolved.id;
        const path = resolved.path;

        if (typeof id !== 'string') {
            throw new Error('Query requires a string id');
        }

        if (typeof path !== 'string') {
            throw new Error('Query requires a string path');
        }

        const queryProps: QueryProps = { id, path };
        Query(ctx, queryProps);
        return <></>;
    }

    const Component = registry[node.name];
    if (!Component) throw new Error(`Unknown component "${node.name}"`);

    /* Pass the parsed XML attributes through as component props. */
    rendered = <Component {...resolved} children={node.children} />;

    return <XmlErrorBoundary resetKey={node}>{rendered}</XmlErrorBoundary>;
}

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(node: RenderableASTNode): ReactNode {
    const runtime = useReactContext(RuntimeContext);
    const ctx: ExecutionContext = runtime ?? { values: {} };

    return renderNodeWithContext(node, ctx);
}

/** Renders a parsed XML tree inside the active XML runtime contexts. */
function XmlRenderer({ ast, ctx, baseUrl }: { ast: ASTNode[]; ctx: ExecutionContext; baseUrl: string }): ReactNode {
    ctx.baseUrl = baseUrl;

    return (
        <XmlErrorBoundary resetKey={ast}>
            <Suspense fallback={<></>}>
                <BaseUrlContext.Provider value={baseUrl}>
                    <RuntimeProvider value={ctx}>{renderNode(ast)}</RuntimeProvider>
                </BaseUrlContext.Provider>
            </Suspense>
        </XmlErrorBoundary>
    );
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext, baseUrl = ''): ReactNode {
    return <XmlRenderer ast={ast} ctx={ctx} baseUrl={baseUrl} />;
}

/** Backwards-compatible alias for callers that still import renderXml. */
export function renderXml(node: RenderableASTNode, _ctx: ExecutionContext = { values: {} }, _baseUrl = ''): ReactNode {
    return renderNodeWithContext(node, _ctx);
}
