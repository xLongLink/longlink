import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router';

type LayoutProps = {
    tabs: Record<string, string>;
    children: ReactNode;
};

/** Renders the shared breadcrumb, tab bar, and profile shell. */
export default function Layout({ tabs, children }: LayoutProps) {
    const location = useLocation();
    const tabEntries = Object.entries(tabs);
    const currentPath = `${location.pathname}${location.search}`;

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        <UserProfile />
                    </div>
                </div>

                {tabEntries.length ? (
                    <div className="mx-auto w-full px-6">
                        <div className="flex w-full items-center gap-2 border-b border-white/10">
                            {tabEntries.map(([label, href]) => {
                                const targetUrl = new URL(href, `${window.location.origin}${location.pathname}`);
                                const isActive = `${targetUrl.pathname}${targetUrl.search}` === currentPath;

                                return (
                                    <Link
                                        key={label}
                                        to={href}
                                        replace
                                        aria-current={isActive ? 'page' : undefined}
                                        className={cn(
                                            'relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 pb-3 text-sm font-medium text-white/60 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white',
                                            isActive &&
                                                'text-white after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-white'
                                        )}
                                    >
                                        {label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">{children}</main>
        </div>
    );
}
