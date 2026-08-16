import { Outlet } from 'react-router';
import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AstryxProvider } from '@/providers';
import { createQueryClient } from '@/lib/react-query';
import { Document } from '@/components/layouts/Document';

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
