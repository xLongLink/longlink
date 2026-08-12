import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import '@/index.css';
import { Document } from '@/layout/Document';
import { createQueryClient } from '@/lib/react-query';
import { AstryxProvider } from '@/providers';

export const meta = () => [{ title: 'LongLink' }];

/** Renders the complete embedded Application HTML document. */
export function Layout({ children }: { children: ReactNode }) {
    return <Document>{children}</Document>;
}

/** Provides isolated runtime state around the embedded Application route. */
export default function ApplicationRoot() {
    const [client] = useState(createQueryClient);

    return (
        <QueryClientProvider client={client}>
            <AstryxProvider mode="dark">
                <Outlet />
            </AstryxProvider>
        </QueryClientProvider>
    );
}
