import { Outlet } from 'react-router';
import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Document } from '@/layout/Document';
import { AstryxProvider } from '@/providers';
import { UserProvider } from '@/hooks/use-user';
import { createQueryClient } from '@/lib/react-query';

/** Renders the complete Platform HTML document for prerendering and hydration. */
export function Layout({ children }: { children: ReactNode }) {
    return <Document>{children}</Document>;
}

/** Provides isolated Platform runtime state around the active framework route. */
export default function PlatformRoot() {
    const [client] = useState(createQueryClient);

    return (
        <QueryClientProvider client={client}>
            <UserProvider>
                <AstryxProvider>
                    <Outlet />
                </AstryxProvider>
            </UserProvider>
        </QueryClientProvider>
    );
}
