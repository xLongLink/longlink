import { UserProvider } from '@/hooks/use-user';
import XML from '@/layout/XmlLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

describe('XmlLayout', () => {
    it('uses explicit tab active state when provided', () => {
        const previousWindow = globalThis.window;

        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: { location: { origin: 'http://localhost' } },
        });

        try {
            const queryClient = new QueryClient();
            const output = renderToStaticMarkup(
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    createElement(
                        UserProvider,
                        null,
                        createElement(
                            MemoryRouter,
                            { initialEntries: ['/issues/123'] },
                            createElement(XML, {
                                tabs: { Issues: { active: true, href: '/issues' } },
                                children: createElement('main', null, 'Content'),
                            })
                        )
                    )
                )
            );

            expect(output).toContain('aria-current="page"');
            expect(output).toContain('Issues');
        } finally {
            Object.defineProperty(globalThis, 'window', {
                configurable: true,
                value: previousWindow,
            });
        }
    });
});
