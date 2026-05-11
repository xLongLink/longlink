import type { ReactNode } from 'react';

import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';

type LayoutProps = {
    children: ReactNode;
};

/** Wraps public pages with the shared navigation and footer. */
export default function Layout({ children }: LayoutProps) {
    return (
        <div className="page-shell min-h-screen text-white">
            <Navbar />
            {children}
            <Footer />
        </div>
    );
}
