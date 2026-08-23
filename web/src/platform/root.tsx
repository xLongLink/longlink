import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { RootProvider } from '@/providers';
import '@/index.css';
import { Document } from '@/components/layouts/Document';

/** Renders the complete Platform HTML document for prerendering and hydration. */
export function Layout({ children }: { children: ReactNode }) {
    return <Document>{children}</Document>;
}

/** Provides isolated Platform runtime state around the active framework route. */
export default function PlatformRoot() {
    return (
        <RootProvider>
            <Outlet />
        </RootProvider>
    );
}
