import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import { useUserProfile } from '@/hooks/use-user';
import { useTranslation } from '@/lib/i18n';
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

type LayoutTabEntry = {
    icon?: LucideIcon;
    label: string;
    href: string;
    pathname: string;
};

/** Renders the shared page shell with either breadcrumbs or brand-only header chrome. */
export default function Layout({ tabs, brandOnly = false, brandHref = '/organizations', children }: LayoutProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const currentPathname = location.pathname;
    const normalizedCurrentPathname = normalizePathname(currentPathname);
    const tabEntries = Object.entries(tabs ?? {}).map(([label, tab]) => {
        const href = typeof tab === 'string' ? tab : tab.href;
        const icon = typeof tab === 'string' ? undefined : tab.icon;
        const targetUrl = new URL(href, `${window.location.origin}${location.pathname}`);

        return {
            label,
            icon,
            href,
            pathname: normalizePathname(targetUrl.pathname),
        };
    });
    const activeTabPathname = getActiveTabPathname(tabEntries, normalizedCurrentPathname);
    const { user } = useUserProfile();

    /** Normalizes a pathname for deterministic active tab matching. */
    function normalizePathname(pathname: string) {
        if (pathname === '/') {
            return '/';
        }

        return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    }

    /** Returns whether a tab pathname is active for the current path. */
    function isTabPathActive(tabPathname: string, pathname: string): boolean {
        if (tabPathname === pathname) {
            return true;
        }

        return pathname.startsWith(`${tabPathname}/`);
    }

    /** Selects the deepest matching tab path for the current route. */
    function getActiveTabPathname(items: LayoutTabEntry[], pathname: string): string | undefined {
        const matching = items.filter((item) => isTabPathActive(item.pathname, pathname));

        return matching.reduce<string | undefined>(
            (best, item) =>
                best === undefined || item.pathname.length > best.length
                    ? item.pathname
                    : best,
            undefined
        );
    }

    const header = (
        <>
            <div className="mx-auto w-full px-6 pb-2 pt-4 text-foreground/80">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {brandOnly ? (
                            <Link
                                to={brandHref}
                                aria-label={t('common.longlinkHome')}
                                className="inline-flex items-center"
                            >
                                <Wordmark />
                            </Link>
                        ) : (
                            <Breadcrumb />
                        )}
                    </div>
                    {/* Show Documentation when the profile dropdown is not available. */}
                    {user ? (
                        <UserProfile />
                    ) : (
                        <Link
                            to="/docs"
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {t('common.documentation')}
                        </Link>
                    )}
                </div>
            </div>

            {!tabEntries.length ? null : (
                <div className="mx-auto w-full px-6 pb-0 pt-0">
                    <div className="flex w-full items-center gap-2 border-b border-white/10">
                        {tabEntries.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = tab.pathname === activeTabPathname;

                            return (
                                <Link
                                    key={tab.label}
                                    to={tab.href}
                                    replace
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 pb-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground',
                                        isActive &&
                                            'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground'
                                    )}
                                >
                                    {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );

    return <TopLayout header={header}>{children}</TopLayout>;
}
