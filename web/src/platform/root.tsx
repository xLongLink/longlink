import { useState, type ReactNode } from 'react';
import { Outlet, type MetaFunction } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { noIndexMeta } from '@/lib/seo';
import { Document } from '@/layout/Document';
import { AstryxProvider } from '@/providers';
import { UserProvider } from '@/hooks/use-user';
import { createQueryClient } from '@/lib/react-query';

export const meta: MetaFunction = () => noIndexMeta();

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
