import * as icons from '@/lib/icons';
import type { ReactNode } from 'react';
import { PageLoading } from '@/components/Utils';
import { Link as RouterLink } from 'react-router';
import { ApiBoundary } from '@/components/ApiBoundary';
import { ApiProvider } from '@/components/ApiProvider';
import { appearanceBootstrap } from '@/lib/appearance';
import { LinkProvider } from '@astryxdesign/core/Link';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { IconRequestContext } from '@/components/ui/Icon';
import { AppearanceProvider } from '@/components/Appearance';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import '@/index.css';

/** Shows the themed loading state while the initial route modules load. */
export function HydrateFallback() {
    // The document's startup theme styles the fallback before providers mount.
    return <PageLoading label="Loading" />;
}

/** Provides isolated runtime state around the active Solution route. */
export default function SolutionRoot() {
    // Keep theme, link, layer, and API ownership around the active route.
    return (
        <AppearanceProvider>
            <LinkProvider component={RouterLink}>
                <LayerProvider toast={{ position: 'bottomEnd' }}>
                    <IconRequestContext value={icons.load}>
                        <ApiProvider>
                            <ApiBoundary>
                                <Outlet />
                            </ApiBoundary>
                        </ApiProvider>
                    </IconRequestContext>
                </LayerProvider>
            </LinkProvider>
        </AppearanceProvider>
    );
}

/** Renders the Solution HTML document shell. */
export function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" data-astryx-theme="stone" suppressHydrationWarning>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <script>{appearanceBootstrap}</script>
                <meta name="robots" content="noindex, nofollow" />
                <Meta />
                <Links />
                <link rel="icon" href="/favicon.ico" />
                <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" sizes="any" />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

/** Declares metadata for the SDK's static SPA fallback document. */
export const meta = () => [{ title: 'LongLink' }];
