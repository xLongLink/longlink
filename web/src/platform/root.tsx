import type { ReactNode } from 'react';
import { PageLoading } from '@/components/ui/utils';
import { AccountProvider } from '@/platform/account';
import { appearanceBootstrap } from '@/lib/appearance';
import { ApiBoundary, ApiProvider } from '@/components/api';
import { AppearanceContext } from '@/lib/hooks/use-appearance';
import { useDocumentAppearance } from '@/lib/hooks/use-document-appearance';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from 'react-router';
import '@/index.css';

/** Shows the themed loading state while the initial route modules load. */
export function HydrateFallback() {
    // The document's startup theme styles the fallback before providers mount.
    return <PageLoading label="Loading" />;
}

/** Provides the Platform runtime and native fonts. */
export default function PlatformRoot() {
    const { pathname } = useLocation();
    const isHome = pathname === '/';
    useDocumentAppearance(isHome ? 'dark' : undefined);

    // The public landing page has no account queries or personal appearance synchronization.
    const content = isHome ? (
        <Outlet />
    ) : (
        <ApiProvider platformSession>
            <AccountProvider>
                <ApiBoundary>
                    <Outlet />
                </ApiBoundary>
            </AccountProvider>
        </ApiProvider>
    );

    return isHome ? <AppearanceContext value={{ theme: 'dark' }}>{content}</AppearanceContext> : content;
}

/** Adds website analytics only to production Platform documents. */
export function Layout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const isHome = pathname === '/';

    return (
        <html
            lang="en"
            className={
                /^\/(login|auth\/(register|verify-email|forgot-password|reset-password))\/?$/.test(pathname)
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
