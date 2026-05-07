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
    for (const node of ast) {
        if (node.name === 'For') {
            continue;
        }

        const resolved: Record<string, unknown> = {};

        // Make sure that the state are initialized and exist in the context before evaluating the expressions.
        if (node.name === 'State') {
            const id = resolved.id;

            if (typeof id !== 'string') throw new Error('State requires a string id');
            if (resolved.value == null) throw new Error('State requires a value');
            if (typeof resolved.value !== 'string' && typeof resolved.value !== 'number' && !Array.isArray(resolved.value)) {
                throw new Error('State value must be a string, number, or array');
            }

            state(ctx, id, resolved.value);
            continue;
        }

        // Make sure that the queries are executed and exist in the context before evaluating the expressions.
        if (node.name === 'Query') {
            const id = resolved.id;
            const path = resolved.path;

            if (typeof id !== 'string') throw new Error('Query requires a string id');
            if (typeof path !== 'string') throw new Error('Query requires a string path');

            try {
                await query(ctx, id, path, baseUrl);
            } catch (error) {
                throw error;
            }
        }
    }

    return ctx;
}
