import { act } from 'react';
import { expect, it } from 'vitest';
import * as icons from '@/lib/icons';
import { MemoryRouter } from 'react-router';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { stoneTheme } from '@/lib/generated/stone.js';
import type { ComponentType, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { IconRequestContext } from '@/components/ui/contexts';
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
                <Theme theme={stoneTheme} mode="dark">
                    <LayerProvider>
                        <QueryClientProvider client={client}>{children}</QueryClientProvider>
                    </LayerProvider>
                </Theme>
            </MemoryRouter>
        );

        const output = document.createElement('section');
        output.innerHTML = markup;

        return output;
    } finally {
        client.clear();
    }
}

/** Checks the published heading and article landmark of an independently routed documentation page. */
export function documentationPage(Page: ComponentType, heading: string, path: string) {
    it('publishes its documented heading within an article', () => {
        // Act
        const output = renderStatic(
            <IconRequestContext value={icons.load}>
                <Page />
            </IconRequestContext>,
            path
        );

        // Assert
        expect(output.querySelector('article h1')?.textContent).toBe(heading);
        expect(output.querySelector('title')?.textContent).toContain('LongLink');
    });
}

/** Runs DOM-level interaction checks with deterministic mounting and cleanup. */
export async function withMounted(children: ReactNode, check: (output: HTMLElement) => Promise<void>) {
    const output = document.createElement('section');
    document.body.append(output);
    const root = createRoot(output);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const actEnvironment = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, writable: true, value: true });

    try {
        await act(async () =>
            root.render(
                <MemoryRouter>
                    <Theme theme={stoneTheme} mode="dark">
                        <LayerProvider>
                            <QueryClientProvider client={client}>{children}</QueryClientProvider>
                        </LayerProvider>
                    </Theme>
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
