import { Outlet, type MetaFunction } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import '@/index.css';
import { noIndexMeta } from '@/lib/seo';
import { Document } from '@/layout/Document';
import { AstryxProvider } from '@/providers';
import { createQueryClient } from '@/lib/react-query';
import { UserProvider, useUserProfile } from '@/hooks/use-user';
import { ThemeBootstrap, THEME_BOOTSTRAP_ID } from '@/components/ThemeBootstrap';

export const meta: MetaFunction = () => noIndexMeta();

/** Renders the complete Platform HTML document for prerendering and hydration. */
export function Layout({ children }: { children: ReactNode }) {
    return <Document headContent={<ThemeBootstrap />}>{children}</Document>;
}

/** Applies the authenticated user's theme to Platform routes. */
function PlatformShell() {
    const { theme, accent, radius, isLoading } = useUserProfile();

    // Keep cached first-paint overrides until the server-backed theme is ready.
    useLayoutEffect(() => {
        if (isLoading) {
            return;
        }

        document.getElementById(THEME_BOOTSTRAP_ID)?.remove();
    }, [isLoading]);

    return (
        <AstryxProvider accent={accent} mode={theme} radius={radius}>
            <Outlet />
        </AstryxProvider>
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
