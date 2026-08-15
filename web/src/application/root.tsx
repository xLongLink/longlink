import { Outlet } from 'react-router';
import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { AstryxProvider } from '@/providers';
import { createQueryClient } from '@/lib/react-query';
import { Document } from '@/components/layouts/Document';

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
            <AstryxProvider>
                <Outlet />
            </AstryxProvider>
        </QueryClientProvider>
    );
}
