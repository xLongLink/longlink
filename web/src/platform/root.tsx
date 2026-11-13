import * as icons from '@/lib/icons';
import type { ReactNode } from 'react';
import { PageLoading } from '@/components/Utils';
import { ApiBoundary } from '@/components/ApiBoundary';
import { ApiProvider } from '@/components/ApiProvider';
import { appearanceBootstrap } from '@/lib/appearance';
import { IconRequestContext } from '@/components/ui/contexts';
import { AppearanceContext } from '@/lib/hooks/use-appearance';
import { useDocumentTheme } from '@/lib/hooks/use-document-theme';
import { AccountAppearanceProvider } from '@/components/Appearance';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from 'react-router';
import '@/index.css';
// Handwritten fonts belong only to native Platform pages, not the embedded SDK application.
import '@fontsource/kalam';
import '@fontsource/kalam/700.css';

/** Shows the themed loading state while the initial route modules load. */
export function HydrateFallback() {
    // The document's startup theme styles the fallback before providers mount.
    return <PageLoading label="Loading" />;
}

/** Provides the Platform runtime and native fonts. */
export default function PlatformRoot() {
    const { pathname } = useLocation();
    const isHome = pathname === '/';
    useDocumentTheme(isHome ? 'dark' : undefined);

    // The public landing page has no account queries or personal appearance synchronization.
    const content = (
        <IconRequestContext value={icons.load}>
            {isHome ? (
                <Outlet />
            ) : (
                <ApiProvider>
                    <AccountAppearanceProvider>
                        <ApiBoundary>
                            <Outlet />
                        </ApiBoundary>
                    </AccountAppearanceProvider>
                </ApiProvider>
            )}
        </IconRequestContext>
    );

    return isHome ? (
        <AppearanceContext value={{ appearance: { theme: 'dark', accent: 'neutral' } }}>{content}</AppearanceContext>
    ) : (
        content
    );
}

/** Adds website analytics only to production Platform documents. */
export function Layout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const isHome = pathname === '/';

    return (
        <html
            lang="en"
            className={
                /^\/(login|auth\/(register|forgot-password|reset-password))\/?$/.test(pathname)
                    ? '[scrollbar-gutter:auto]'
                    : undefined
            }
            data-theme-scope="stone"
            data-theme={isHome ? 'dark' : undefined}
            suppressHydrationWarning
        >
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <script data-platform>{appearanceBootstrap}</script>
                <Meta />
                <Links />
                <link rel="icon" href="/favicon.ico" />
                <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" sizes="any" />
                {import.meta.env.PROD && (
                    <script
                        defer
                        src="https://cloud.umami.is/script.js"
                        data-website-id="eff115b8-10d7-4507-abf5-6b3de55eab3f"
                    />
                )}
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}
