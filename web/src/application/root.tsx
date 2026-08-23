import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { RootProvider } from '@/providers';
import '@/index.css';
import { Document } from '@/components/layouts/Document';

export const meta = () => [{ title: 'LongLink' }];

/** Renders the complete embedded Application HTML document. */
export function Layout({ children }: { children: ReactNode }) {
    return <Document>{children}</Document>;
}

/** Provides isolated runtime state around the embedded Application route. */
export default function ApplicationRoot() {
    return (
        <RootProvider>
            <Outlet />
        </RootProvider>
    );
}
