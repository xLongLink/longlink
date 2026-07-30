import { QueryClientProvider } from '@tanstack/react-query';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Outlet, type MetaFunction } from 'react-router';
import '@/index.css';
import { ThemeBootstrap } from '@/components/ThemeBootstrap';
import { UserProvider, useUserProfile } from '@/hooks/use-user';
import { Document } from '@/layout/Document';
import { I18nProvider } from '@/lib/i18n';
import { createQueryClient } from '@/lib/react-query';
import { noIndexMeta } from '@/lib/seo';
import { AstryxProvider } from '@/providers';

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
