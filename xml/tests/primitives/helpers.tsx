/**
 * Shared test utilities for primitive component tests.
 *
 * Primitive components (For, State, Query) call useRuntime() internally, which
 * requires them to be rendered inside a RuntimeProvider. This module provides a
 * minimal wrapper so each test file doesn't need to repeat the setup.
 */
import { type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RuntimeProvider } from '../../src/runtime';
import type { ASTNode, ExecutionContext } from '../../src/types';
import type { RegistryShape } from '../../src/types';

/** Builds a minimal ExecutionContext for use in tests. */
export function makeCtx(
    state: Record<string, any> = {},
    queries: Record<string, any> = {},
    scope: Record<string, any> = {}
): ExecutionContext {
    return {
        state: Object.fromEntries(Object.entries(state).map(([k, v]) => [k, [v, () => {}]])),
        queries,
        scope,
    };
}

/** Renders children inside a RuntimeProvider with the given context. */
export function renderWithRuntime(
    children: ReactNode,
    ctx: ExecutionContext = makeCtx(),
    registry: RegistryShape = {}
) {
    const node: ASTNode = { name: 'root' };
    return render(<RuntimeProvider value={{ node, ctx, registry }}>{children}</RuntimeProvider>);
}

/** Renders children inside both a QueryClientProvider and a RuntimeProvider. */
export function renderWithQuery(
    children: ReactNode,
    ctx: ExecutionContext = makeCtx(),
    registry: RegistryShape = {}
) {
    const node: ASTNode = { name: 'root' };
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={client}>
            <RuntimeProvider value={{ node, ctx, registry }}>{children}</RuntimeProvider>
        </QueryClientProvider>
    );
}
