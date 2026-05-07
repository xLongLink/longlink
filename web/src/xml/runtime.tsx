import { evaluate } from '@xml/expressions';
import type { ExecutionContext } from '@xml/types';
import { createContext, useContext as useReactContext, type ReactNode } from 'react';

export const BaseUrlContext = createContext<string>('');
export const RuntimeContext = createContext<ExecutionContext | null>(null);

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

/** Resolves a request URL against the active base URL. */
export function useUrl(path: string): string {
    const baseUrl = useReactContext(BaseUrlContext);

    return resolveUrl(baseUrl, path);
}

/** Resolves a request URL against a base URL string. */
export function resolveUrl(baseUrl: string, path: string): string {
    if (!path) return baseUrl;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!baseUrl) return path;

    return `${baseUrl}${path}`;
}

/** Re-exports expression evaluation for runtime callers. */
export { evaluate };
