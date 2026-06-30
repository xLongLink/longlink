import { UserProvider } from '@/hooks/use-user';
import XML from '@/layout/XmlLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'bun:test';
import { ShoppingCart } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

describe('XmlLayout', () => {
    it('renders tab icons when provided', () => {
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
                            { initialEntries: ['/?tab=cart'] },
                            createElement(XML, {
                                tabs: { Cart: { href: '/?tab=cart', icon: ShoppingCart } },
                                children: createElement('main', null, 'Content'),
                            })
                        )
                    )
                )
            );

            expect(output).toContain('Cart');
            expect(output).toContain('<svg');
            expect(output).toContain('lucide-shopping-cart');
        } finally {
            Object.defineProperty(globalThis, 'window', {
                configurable: true,
                value: previousWindow,
            });
        }
    });
});
