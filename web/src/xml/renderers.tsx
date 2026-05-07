import { XmlErrorBoundary } from '@xml/errors';
import { compile, evaluate } from '@xml/expressions';
import { Query } from '@xml/primitives/Query';
import { State } from '@xml/primitives/State';
import { registry } from '@xml/registry';
import { BaseUrlContext, RuntimeContext, RuntimeProvider } from '@xml/runtime';
import type { ASTNode, ExecutionContext, RenderableASTNode } from '@xml/types';
import { Fragment, useEffect, useContext as useReactContext, useState, type ReactNode } from 'react';


/**
 * Renders XML AST nodes using the active runtime context when present.
 *
 * Example:
 *   Input:
 *     { name: 'Button', params: { if: 'true' }, children: [{ name: 'Text', params: { value: 'Save' } }] }
 *   Output:
 *     <Button><Text value="Save" /></Button>
 */
export function renderNode(node: RenderableASTNode, ctx?: ExecutionContext): ReactNode {
    const runtime = ctx ?? useReactContext(RuntimeContext) ?? { values: {} };

    // Handle null/undefined early to avoid unnecessary registry lookups and error boundaries.
    if (!node) return <></>;
    if (typeof node === 'string' || typeof node === 'number') return node;
    if (typeof node === 'boolean') return <></>;

    let rendered: ReactNode;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, runtime)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null) {
        if (!Boolean(evaluate(node.params.if, runtime, { nodeName: node.name, attributeName: 'if' }))) {
            return <></>;
        }
    }

    const resolved: Record<string, unknown> = {};

    /* Resolve XML attributes into component props and compile event handlers lazily. */
    if (node.params) {
        for (const [key, value] of Object.entries(node.params)) {
            if (key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
                resolved[key] = compile(value);
                continue;
            }

            resolved[key] = evaluate(value, runtime, { attributeName: key });
        }
    }

    if (node.name === 'State' || node.name === 'Query') return <></>;

    const Component = registry[node.name];
    if (!Component) throw new Error(`Unknown component "${node.name}"`);

    /* Pass the parsed XML attributes through as component props. */
    rendered = <Component {...resolved} children={node.children} />;

    return <XmlErrorBoundary resetKey={node}>{rendered}</XmlErrorBoundary>;
}


/**
 * Renders a top-level ASTNode array into a React node.
 * Renders a parsed XML tree with loading state while context initializes.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext, baseUrl = ''): ReactNode {
    const [initializedCtx, setInitializedCtx] = useState<ExecutionContext | null>(null);

    useEffect(() => {
        let active = true;

        /* Resolve top-level State and Query nodes before rendering the page tree. */
        (async () => {
            for (const node of ast) {
                if (node.name === 'For') {
                    continue;
                }

                const resolved: Record<string, unknown> = {};

                if (node.params) {
                    for (const [key, value] of Object.entries(node.params)) {
                        if (key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
                            resolved[key] = compile(value);
                            continue;
                        }

                        resolved[key] = evaluate(value, ctx, { attributeName: key });
                    }
                }

                if (node.name === 'State') {
                    const id = resolved.id;

                    if (typeof id !== 'string') throw new Error('State requires a string id');

                    State(ctx, { id, value: resolved.value });
                    continue;
                }

                if (node.name === 'Query') {
                    const id = resolved.id;
                    const path = resolved.path;

                    if (typeof id !== 'string') throw new Error('Query requires a string id');
                    if (typeof path !== 'string') throw new Error('Query requires a string path');

                    try {
                        Query(ctx, { id, path });
                    } catch (error) {
                        if (error instanceof Promise) {
                            await error;
                            continue;
                        }

                        throw error;
                    }
                }
            }

            if (active) setInitializedCtx(ctx);
        })().catch((error) => {
            if (active) throw error;
        });

        return () => {
            active = false;
        };
    }, [ast, ctx]);

    // TODO: Given that we already have the ast, this can create a skeleton UI.
    if (!initializedCtx) {
        return <div>Loading</div>;
    }

    return (
        <XmlErrorBoundary resetKey={ast}>
            <BaseUrlContext.Provider value={baseUrl}>
                <RuntimeProvider value={initializedCtx}>{renderNode(ast, initializedCtx)}</RuntimeProvider>
            </BaseUrlContext.Provider>
        </XmlErrorBoundary>
    );
}
