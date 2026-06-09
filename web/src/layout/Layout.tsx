import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router';

import TopLayout from './TopLayout';

type LayoutTab = {
    href: string;
    icon?: LucideIcon;
};

type LayoutProps = {
    tabs?: Record<string, string | LayoutTab>;
    brandOnly?: boolean;
    brandHref?: string;
    children: ReactNode;
};

/** Renders the shared page shell with either breadcrumbs or brand-only header chrome. */
export default function Layout({ tabs, brandOnly = false, brandHref = '/organizations', children }: LayoutProps) {
    const location = useLocation();
    const tabEntries = Object.entries(tabs ?? {});
    const currentPath = `${location.pathname}${location.search}`;
    const { user } = useUser();

    const header = (
        <>
            <div className="mx-auto w-full px-6 pb-2 pt-4 text-white/80">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {brandOnly ? (
                            <Link to={brandHref} aria-label="LongLink home" className="inline-flex items-center">
                                <Wordmark />
                            </Link>
                        ) : (
                            <Breadcrumb />
                        )}
                    </div>
                    {/* Show Docs when the profile dropdown is not available. */}
                    {user ? (
                        <UserProfile />
                    ) : (
                        <Link to="/docs" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
                            Docs
                        </Link>
                    )}
                </div>
            </div>

            {!tabEntries.length ? null : (
                <div className="mx-auto w-full px-6 pb-0 pt-0">
                    <div className="flex w-full items-center gap-2 border-b border-white/10">
                        {tabEntries.map(([label, tab]) => {
                            const href = typeof tab === 'string' ? tab : tab.href;
                            const Icon = typeof tab === 'string' ? undefined : tab.icon;
                            const targetUrl = new URL(href, `${window.location.origin}${location.pathname}`);
                            const isActive = `${targetUrl.pathname}${targetUrl.search}` === currentPath;

                            return (
                                <Link
                                    key={label}
                                    to={href}
                                    replace
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 pb-1 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white',
                                        isActive &&
                                            'text-white after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-white'
                                    )}
                                >
                                    {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );

    return (
        <TopLayout header={header}>{children}</TopLayout>
    );
}
