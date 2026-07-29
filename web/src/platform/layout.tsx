import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import { useUserProfile } from '@/hooks/use-user';
import TopLayout from '@/layout/TopLayout';
import { normalizePathname } from '@/platform/paths';

type PlatformLayoutTab = {
    href: string;
    icon?: LucideIcon;
};

type PlatformLayoutProps = {
    tabs?: Record<string, PlatformLayoutTab>;
    brandOnly?: boolean;
    brandHref?: string;
    fillViewport?: boolean;
    reserveTabSpace?: boolean;
    children: ReactNode;
};

type PlatformLayoutTabEntry = {
    icon?: LucideIcon;
    label: string;
    href: string;
    pathname: string;
};

/** Renders the Platform shell with either breadcrumbs or brand-only header chrome. */
export default function PlatformLayout({
    tabs,
    brandOnly = false,
    brandHref = '/organizations',
    fillViewport = false,
    reserveTabSpace = false,
    children,
}: PlatformLayoutProps) {
    const t = useTranslator();
    const location = useLocation();
    const normalizedCurrentPathname = normalizePathname(location.pathname);
    const tabEntries = Object.entries(tabs ?? {}).map(([label, tab]) => {
        const targetUrl = new URL(tab.href, window.location.origin);

        return {
            label,
            icon: tab.icon,
            href: tab.href,
            pathname: normalizePathname(targetUrl.pathname),
        };
    });
    const activeTabPathname = getActiveTabPathname(tabEntries, normalizedCurrentPathname);
    const { user } = useUserProfile();

    /** Returns whether a tab pathname is active for the current path. */
    function isTabPathActive(tabPathname: string, pathname: string): boolean {
        // Exact tab matches are always active.
        if (tabPathname === pathname) {
            return true;
        }

        return pathname.startsWith(`${tabPathname}/`);
    }

    /** Selects the deepest matching tab path for the current route. */
    function getActiveTabPathname(items: PlatformLayoutTabEntry[], pathname: string): string | undefined {
        const matching = items.filter((item) => isTabPathActive(item.pathname, pathname));

        return matching.reduce<string | undefined>(
            (best, item) => (best === undefined || item.pathname.length > best.length ? item.pathname : best),
            undefined
        );
    }

    return (
        <TopLayout
            activeTab={activeTabPathname}
            endContent={
                user ? (
                    <UserProfile />
                ) : (
                    <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            {t('common.documentation')}
                            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                        </span>
                    </Link>
                )
            }
            heading={
                brandOnly ? (
                    <Link href={brandHref} label={t('common.longlinkHome')} color="inherit">
                        <Wordmark />
                    </Link>
                ) : (
                    <Breadcrumb />
                )
            }
            height={fillViewport ? 'fill' : 'auto'}
            reserveTabSpace={reserveTabSpace}
            tabs={tabEntries.map(({ pathname, ...tab }) => ({ ...tab, value: pathname }))}
            topNavClassName="min-h-11 px-7"
        >
            {children}
        </TopLayout>
    );
}
