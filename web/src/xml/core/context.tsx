import { createContext as createReactContext, useContext as useReactContext, type ReactNode } from 'react';
import { evaluate, isText } from '../expressions';
import type { ASTNode, ExecutionContext } from '../types';
import { query } from './query';
import { state } from './state';

export const Context = createReactContext<ExecutionContext | null>(null);

/** Creates a blank XML runtime context. */
export function createContext(): ExecutionContext {
    return {
        locale: 'en',
        setups: {},
        invalidate: async () => {},
        values: {},
    };
}

/** Provides XML runtime scope to a rendered subtree. */
export function ContextProvider({ value, children }: { value: ExecutionContext; children: ReactNode }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Returns the active XML runtime state from the XML context. */
export function useXmlContext(): { ctx: ExecutionContext } {
    const runtime = useReactContext(Context);

    if (!runtime) {
        throw new Error('useXmlContext must be used inside a rendered XML component');
    }

    return { ctx: runtime };
}

/** Resolves top-level State and Query nodes before rendering the page tree. */
export async function setupContext(ast: ASTNode[], ctx: ExecutionContext, baseUrl: string): Promise<ExecutionContext> {
    const setups = ctx.setups;

    async function walk(nodes: ASTNode[]): Promise<void> {
        for (const node of nodes) {
            // If we reach a "For" component, we stop the walk since the content of "For" has a different context.
            if (node.name === 'For') continue;

            // Seed state and queries before rendering the component tree.
            if (node.name === 'State') {
                validateSetupNode(node);

                const params = node.params!;
                const id = params.id.trim();
                const entries = Object.entries(params).filter(([key]) => key !== 'id');

                // Preserve local state across renderer refreshes; invalidation deletes the slot before setup runs.
                setups[id] = () => {
                    if (!(id in ctx.values)) {
                        // Seed a proxied object from all attributes except `id`.
                        const initialValue: Record<string, unknown> = {};

                        for (const [key, rawValue] of entries) {
                            const input = rawValue.trim();

                            if (input === '') {
                                initialValue[key] = '';
                                continue;
                            }

                            try {
                                initialValue[key] = JSON.parse(input);
                                continue;
                            } catch {
                                initialValue[key] = evaluate(rawValue, ctx);
                            }
                        }

                        state(ctx, id, initialValue);
                    }
                };
                await setups[id]();
            }

            if (node.name === 'Query') {
                validateSetupNode(node);

                const params = node.params!;
                const id = params.id.trim();
                const rawPath = params.path.trim();

                // We store the setup function so that in case of invalidation it can be re-run to refetch the data.
                setups[id] = () => {
                    const path = evaluate(rawPath, ctx);

                    // Query paths may interpolate route params, but must still resolve to a URL string.
                    if (path == null || typeof path === 'object' || typeof path === 'function') {
                        throw new Error('Query path must resolve to a string');
                    }

                    return query(ctx, id, String(path), baseUrl);
                };
                await setups[id]();
            }

            await walk(node.children ?? []);
        }
    }

    await walk(ast);

    return ctx;
}

/** Validates setup-only runtime declarations before they are initialized. */
export function validateSetupNodes(nodes: ASTNode[]): void {
    for (const node of nodes) {
        validateSetupNode(node);

        if (node.name !== 'For') {
            validateSetupNodes(node.children ?? []);
        }
    }
}

/** Validates a single setup-only runtime declaration. */
function validateSetupNode(node: ASTNode): void {
    // Longlink accepts optional metadata-only root attributes.
    if (node.name === 'longlink') {
        const params = node.params ?? {};
        const unsupported = Object.keys(params).filter((name) => name !== 'name' && name !== 'icon');

        if (unsupported.length) {
            throw new Error(`Unsupported longlink attributes: ${unsupported.join(', ')}`);
        }
    }

    if (node.name === 'State') {
        if (!node.params?.id) throw new Error('State requires a string id');
        if (!isText(node.params.id)) throw new Error('State id must be literal text');
        if ((node.children ?? []).length > 0) throw new Error('State cannot have children');
    }

    if (node.name === 'Query') {
        if (!node.params?.id) throw new Error('Query requires a string id');
        if (!node.params?.path) throw new Error('Query requires a string path');
        if ((node.children ?? []).length > 0) throw new Error('Query cannot have children');
        if (!isText(node.params.id)) throw new Error('Query id must be literal text');
    }
}
