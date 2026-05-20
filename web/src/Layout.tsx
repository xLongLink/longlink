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
        <div className="min-h-screen text-foreground">
            <header className="border-b border-border">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        <UserProfile />
                    </div>
                </div>

                {tabEntries.length ? (
                    <div className="mx-auto w-full px-6">
                        <div className="flex w-full items-center gap-2 border-b border-border">
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
                                            'relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/5 hover:text-foreground',
                                            isActive &&
                                                'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-accent'
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

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-4">{children}</main>
        </div>
    );
}
