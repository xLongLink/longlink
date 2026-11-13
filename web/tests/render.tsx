import { act } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppearanceProvider } from '@/components/appearance';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** Renders a component through real theme, routing, and query providers without browser automation. */
export function renderStatic(
    children: ReactNode,
    path = '/',
    resources: ReadonlyArray<readonly [string, object]> = []
) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

    // Seed explicit server responses without replacing query or rendering behavior.
    for (const [resource, data] of resources) client.setQueryData(['api', resource], data);

    try {
        const markup = renderToStaticMarkup(
            <MemoryRouter initialEntries={[path]}>
                <AppearanceProvider preference={{ theme: 'dark', accent: 'neutral' }}>
                    <div data-theme-scope="stone" data-theme="dark">
                        <QueryClientProvider client={client}>{children}</QueryClientProvider>
                    </div>
                </AppearanceProvider>
            </MemoryRouter>
        );

        const output = document.createElement('section');
        output.innerHTML = markup;

        return output;
    } finally {
        client.clear();
    }
}

/** Runs DOM-level interaction checks with deterministic mounting and cleanup. */
export async function withMounted(children: ReactNode, check: (output: HTMLElement) => Promise<void>, path = '/') {
    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const actEnvironment = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, writable: true, value: true });

    try {
        await act(async () =>
            root.render(
                <MemoryRouter initialEntries={[path]}>
                    <AppearanceProvider preference={{ theme: 'dark', accent: 'neutral' }}>
                        <div data-theme-scope="stone" data-theme="dark">
                            <QueryClientProvider client={client}>{children}</QueryClientProvider>
                        </div>
                    </AppearanceProvider>
                </MemoryRouter>
            )
        );
        await check(output);
    } finally {
        await act(async () => root.unmount());
        client.clear();
        output.remove();

        if (actEnvironment) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironment);
        else Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    }
}
