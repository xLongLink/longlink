import { isText } from '@xml/core/expressions';
import { query } from '@xml/core/query';
import { state } from '@xml/core/state';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { createContext as createReactContext, useContext as useReactContext, type ReactNode } from 'react';

export const RuntimeContext = createReactContext<ExecutionContext | null>(null);

/** Provides XML runtime scope to a rendered subtree. */
export function RuntimeProvider({ value, children }: { value: ExecutionContext; children: ReactNode }) {
    return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

/** Returns the active XML runtime state. */
export function useContext(): { ctx: ExecutionContext } {
    const runtime = useReactContext(RuntimeContext);

    if (!runtime) {
        throw new Error('useContext must be used inside a rendered XML component');
    }

    return { ctx: runtime };
}

/** Resolves top-level State and Query nodes before rendering the page tree. */
export async function setupContext(ast: ASTNode[], ctx: ExecutionContext, baseUrl: string): Promise<ExecutionContext> {
    const setups = ctx.setups ?? (ctx.setups = []);

    async function walk(nodes: ASTNode[]): Promise<void> {
        for (const node of nodes) {
            if (node.name === 'For') {
                continue;
            }

            // Seed state and queries before rendering the component tree.
            if (node.name === 'State') {
                if (!node.params?.id) throw new Error('State requires a string id');
                if (!node.params?.value) throw new Error('State requires a value');

                if (!isText(node.params.id)) throw new Error('State id must be literal text');
                if (!isText(node.params.value)) throw new Error('State value must be literal text');

                const id = node.params.id.trim();
                const value = node.params.value;

                setups.push({ id, setup: () => state(ctx, id, value) });
                await setups[setups.length - 1].setup();
            }

            if (node.name === 'Query') {
                if (!node.params?.id) throw new Error('Query requires a string id');
                if (!node.params?.path) throw new Error('Query requires a string path');

                if (!isText(node.params.id)) throw new Error('Query id must be literal text');
                if (!isText(node.params.path)) throw new Error('Query path must be literal text');

                const id = node.params.id.trim();
                const path = node.params.path.trim();

                setups.push({ id, setup: () => query(ctx, id, path, baseUrl) });
                await setups[setups.length - 1].setup();
            }

            if (Array.isArray(node.children)) {
                await walk(node.children);
            }
        }
    }

    await walk(ast);

    return ctx;
}
