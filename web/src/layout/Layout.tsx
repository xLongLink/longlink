import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Icon, type IconName, type IconType } from '@astryxdesign/core/Icon';
import { Wordmark } from '@/components/Wordmark';
import { useUserProfile } from '@/hooks/use-user';
import { UserProfile } from '@/components/Profile';
import { Breadcrumb } from '@/components/Breadcrumb';
import TopLayout from './TopLayout';

type LayoutTab = {
    href: string;
    icon?: IconName | IconType;
};

type LayoutProps = {
    tabs?: Record<string, string | LayoutTab>;
    brandOnly?: boolean;
    brandHref?: string;
    fillViewport?: boolean;
    reserveTabSpace?: boolean;
    children: ReactNode;
};

type LayoutTabEntry = {
    icon?: IconName | IconType;
    label: string;
    href: string;
    pathname: string;
};

/** Renders the shared page shell with either breadcrumbs or brand-only header chrome. */
export default function Layout({
    tabs,
    brandOnly = false,
    brandHref = '/organizations',
    fillViewport = false,
    reserveTabSpace = false,
    children,
}: LayoutProps) {
    const t = useTranslator();
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
        // Preserve the root path as-is.
        if (pathname === '/') {
            return '/';
        }

        return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    }

    /** Returns whether a tab pathname is active for the current path. */
    function isTabPathActive(tabPathname: string, pathname: string): boolean {
        // Exact tab matches are always active.
        if (tabPathname === pathname) {
            return true;
        }

        return pathname.startsWith(`${tabPathname}/`);
    }

    /** Selects the deepest matching tab path for the current route. */
    function getActiveTabPathname(items: LayoutTabEntry[], pathname: string): string | undefined {
        const matching = items.filter((item) => isTabPathActive(item.pathname, pathname));

        return matching.reduce<string | undefined>(
            (best, item) => (best === undefined || item.pathname.length > best.length ? item.pathname : best),
            undefined
        );
    }

    const header = (
        <Stack gap={0}>
            <TopNav
                label={t('common.mainNavigation')}
                style={{ minHeight: 'var(--spacing-11)', paddingInline: 'var(--spacing-7)' }}
                heading={
                    brandOnly ? (
                        <Link href={brandHref} label={t('common.longlinkHome')} color="inherit">
                            <Wordmark />
                        </Link>
                    ) : (
                        <Breadcrumb />
                    )
                }
                endContent={
                    user ? (
                        <UserProfile />
                    ) : (
                        <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                            {t('common.documentation')} <Icon icon="externalLink" size="xsm" />
                        </Link>
                    )
                }
            />

            {!tabEntries.length && !reserveTabSpace ? null : (
                <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                    <TabList
                        aria-label="Section navigation"
                        hasDivider
                        onChange={() => undefined}
                        size="sm"
                        value={activeTabPathname ?? ''}
                    >
                        {tabEntries.length ? (
                            tabEntries.map((tab) => (
                                <Tab
                                    key={tab.label}
                                    href={tab.href}
                                    icon={tab.icon ? <Icon icon={tab.icon} size="sm" /> : undefined}
                                    label={tab.label}
                                    value={tab.pathname}
                                />
                            ))
                        ) : (
                            <Tab
                                aria-disabled="true"
                                aria-hidden="true"
                                className="invisible pointer-events-none"
                                label=""
                                value="reserved-tab-space"
                            />
                        )}
                    </TabList>
                </Stack>
            )}
        </Stack>
    );

    return (
        <TopLayout header={header} fullHeight={tabEntries.length > 0} height={fillViewport ? 'fill' : 'auto'}>
            {children}
        </TopLayout>
    );
}
