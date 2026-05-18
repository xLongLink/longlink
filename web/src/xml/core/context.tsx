import { evaluate, isText } from '@xml/core/expressions';
import { query } from '@xml/core/query';
import { state } from '@xml/core/state';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { createContext as createReactContext, useContext as useReactContext, type ReactNode } from 'react';

export const Context = createReactContext<ExecutionContext | null>(null);

/** Creates a blank XML runtime context. */
export function createContext(): ExecutionContext {
    return {
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
                if (!node.params?.id) throw new Error('State requires a string id');
                if (node.params.value == null) throw new Error('State requires a value');
                if (!isText(node.params.id)) throw new Error('State id must be literal text');
                if (node.children != null) throw new Error('State cannot have children');

                const id = node.params.id.trim();
                const value = node.params.value;

                // Re-evaluate the initializer on invalidation so expression-based state stays in sync.
                setups[id] = () => state(ctx, id, evaluate(value, ctx));
                await setups[id]();
            }

            if (node.name === 'Query') {
                if (!node.params?.id) throw new Error('Query requires a string id');
                if (!node.params?.path) throw new Error('Query requires a string path');
                if (node.children != null) throw new Error('Query cannot have children');

                if (!isText(node.params.id)) throw new Error('Query id must be literal text');
                if (!isText(node.params.path)) throw new Error('Query path must be literal text');

                const id = node.params.id.trim();
                const path = node.params.path.trim();

                // We store the setup function so that in case of invalidation it can be re-run to refetch the data.
                setups[id] = () => query(ctx, id, path, baseUrl);
                await setups[id]();
            }

            if (Array.isArray(node.children)) {
                await walk(node.children);
            }
        }
    }

    await walk(ast);

    return ctx;
}
