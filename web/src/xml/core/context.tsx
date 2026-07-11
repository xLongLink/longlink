import { createContext as createReactContext, useContext as useReactContext, type ReactNode } from 'react';
import { evaluate, isSafePropertyName, isText } from '../expressions';
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
    // Fail fast when XML runtime state is unavailable.
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
        // Visit setup declarations in document order.
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
                    // Only seed state that is not already present.
                    if (!(id in ctx.values)) {
                        // Seed a proxied object from all attributes except `id`.
                        const initialValue: Record<string, unknown> = {};

                        // Copy declared attributes into the initial state object.
                        for (const [key, rawValue] of entries) {
                            const input = rawValue.trim();

                            // Preserve empty literal attributes.
                            if (input === '') {
                                initialValue[key] = '';
                                continue;
                            }

                            // Prefer JSON literals before evaluating expressions.
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

            // Seed query data before rendering the component tree.
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
    // Validate each declaration before checking descendants.
    for (const node of nodes) {
        validateSetupNode(node);

        // Skip nested loop content because it has its own scope.
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

        // Reject unknown root metadata.
        if (unsupported.length) {
            throw new Error(`Unsupported longlink attributes: ${unsupported.join(', ')}`);
        }
    }

    // Validate state declarations.
    if (node.name === 'State') {
        // Require a declared state key.
        if (!node.params?.id) throw new Error('State requires a string id');

        // Keep state keys static.
        if (!isText(node.params.id)) throw new Error('State id must be literal text');

        // Prevent unsafe state property names.
        if (!node.params.id.trim() || !isSafePropertyName(node.params.id.trim())) {
            throw new Error('State id must be a safe property name');
        }

        const unsafeAttributes = Object.keys(node.params).filter((name) => name !== 'id' && !isSafePropertyName(name));
        // Reject unsafe state attribute names.
        if (unsafeAttributes.length) {
            throw new Error(`State attributes must be safe property names: ${unsafeAttributes.join(', ')}`);
        }

        // Keep State declarations leaf-only.
        if ((node.children ?? []).length > 0) throw new Error('State cannot have children');
    }

    // Validate query declarations.
    if (node.name === 'Query') {
        // Require a declared query key.
        if (!node.params?.id) throw new Error('Query requires a string id');

        // Require a query source path.
        if (!node.params?.path) throw new Error('Query requires a string path');

        // Keep Query declarations leaf-only.
        if ((node.children ?? []).length > 0) throw new Error('Query cannot have children');

        // Keep query keys static.
        if (!isText(node.params.id)) throw new Error('Query id must be literal text');

        // Prevent unsafe query property names.
        if (!node.params.id.trim() || !isSafePropertyName(node.params.id.trim())) {
            throw new Error('Query id must be a safe property name');
        }
    }
}
