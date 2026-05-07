import { evaluate } from '@xml/core/expressions';
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

        if (node.params) {
            for (const [key, value] of Object.entries(node.params)) {
                if (key.startsWith('on') && key.length > 2 && key[2] === key[2]?.toUpperCase()) {
                    resolved[key] = evaluate(value, ctx, { attributeName: key });
                    continue;
                }

                resolved[key] = evaluate(value, ctx, { attributeName: key });
            }
        }

        if (node.name === 'State') {
            const id = resolved.id;

            if (typeof id !== 'string') throw new Error('State requires a string id');

            state(ctx, { id, value: resolved.value as string | number | unknown[] });
            continue;
        }

        if (node.name === 'Query') {
            const id = resolved.id;
            const path = resolved.path;

            if (typeof id !== 'string') throw new Error('Query requires a string id');
            if (typeof path !== 'string') throw new Error('Query requires a string path');

            try {
                query(ctx, { id, path }, baseUrl);
            } catch (error) {
                if (error instanceof Promise) {
                    await error;
                    continue;
                }

                throw error;
            }
        }
    }

    return ctx;
}

/** Re-exports expression evaluation for runtime callers. */
export { evaluate };
