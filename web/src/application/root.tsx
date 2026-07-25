import { QueryClientProvider } from '@tanstack/react-query';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, type MetaFunction } from 'react-router';
import '@/index.css';
import { I18nProvider } from '@/lib/i18n';
import { AstryxProvider } from '@/providers';
import { DEFAULT_LANGUAGE } from '@/lib/languages';
import { createQueryClient } from '@/lib/react-query';
import { ThemeBootstrap } from '@/components/ThemeBootstrap';

export const meta: MetaFunction = () => [{ title: 'LongLink' }];

/** Renders the complete embedded Application HTML document. */
export function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" data-astryx-theme="longlink-neutral-default" data-theme="dark">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <Meta />
                <Links />
                <link rel="icon" href="/favicon.ico" />
                <link rel="preload" href={interFont} as="font" type="font/woff2" crossOrigin="anonymous" />
                <ThemeBootstrap />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

/** Provides isolated runtime state around the embedded Application route. */
export default function ApplicationRoot() {
    const [client] = useState(createQueryClient);

    // Applications use the bundled default theme instead of Platform user preferences.
    useLayoutEffect(() => {
        document.getElementById('longlink-theme-bootstrap')?.remove();
    }, []);

    return (
        <QueryClientProvider client={client}>
            <I18nProvider language={DEFAULT_LANGUAGE}>
                <AstryxProvider mode="dark">
                    <Outlet />
                </AstryxProvider>
            </I18nProvider>
        </QueryClientProvider>
    );
}
