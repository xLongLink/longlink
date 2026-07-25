import { QueryClientProvider } from '@tanstack/react-query';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, type MetaFunction } from 'react-router';
import '@/index.css';
import { noIndexMeta } from '@/lib/seo';
import { I18nProvider } from '@/lib/i18n';
import { AstryxProvider } from '@/providers';
import { createQueryClient } from '@/lib/react-query';
import { ThemeBootstrap } from '@/components/ThemeBootstrap';
import { UserProvider, useUserProfile } from '@/hooks/use-user';

export const meta: MetaFunction = () => noIndexMeta();

/** Renders the complete Platform HTML document for prerendering and hydration. */
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

/** Applies the authenticated user's theme to Platform routes. */
function PlatformShell() {
    const { theme, accent, radius, isLoading } = useUserProfile();

    // Keep cached first-paint overrides until the server-backed theme is ready.
    useLayoutEffect(() => {
        if (!isLoading) {
            document.getElementById('longlink-theme-bootstrap')?.remove();
        }
    }, [isLoading]);

    return (
        <I18nProvider>
            <AstryxProvider accent={accent} mode={theme} radius={radius}>
                <Outlet />
            </AstryxProvider>
        </I18nProvider>
    );
}

/** Provides isolated Platform runtime state around the active framework route. */
export default function PlatformRoot() {
    const [client] = useState(createQueryClient);

    return (
        <QueryClientProvider client={client}>
            <UserProvider>
                <PlatformShell />
            </UserProvider>
        </QueryClientProvider>
    );
}
