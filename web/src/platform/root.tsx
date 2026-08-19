import { Outlet } from 'react-router';
import { AstryxProvider } from '@/providers';
import { useState, type ReactNode } from 'react';
import '@/index.css';
import { createQueryClient } from '@/lib/react-query';
import { Document } from '@/components/layouts/Document';
import { QueryClientProvider } from '@tanstack/react-query';

/** Renders the complete Platform HTML document for prerendering and hydration. */
export function Layout({ children }: { children: ReactNode }) {
    return <Document>{children}</Document>;
}

/** Provides isolated Platform runtime state around the active framework route. */
export default function PlatformRoot() {
    const [client] = useState(createQueryClient);

    return (
        <QueryClientProvider client={client}>
            <AstryxProvider>
                <Outlet />
            </AstryxProvider>
        </QueryClientProvider>
    );
}
