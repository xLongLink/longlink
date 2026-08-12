import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import TopLayout from '@/layout/TopLayout';
import { Wordmark } from '@/components/Wordmark';
import { useUserProfile } from '@/hooks/use-user';
import { UserProfile } from '@/components/Profile';
import { Breadcrumb } from '@/components/Breadcrumb';
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
    children: ReactNode;
};

/** Renders the Platform shell with either breadcrumbs or brand-only header chrome. */
export default function PlatformLayout({
    tabs = {},
    brandOnly = false,
    brandHref = '/organizations',
    fillViewport = false,
    children,
}: PlatformLayoutProps) {
    const location = useLocation();
    const normalizedCurrentPathname = normalizePathname(location.pathname);
    const tabEntries = Object.entries(tabs).map(([label, tab]) => {
        return {
            label,
            icon: tab.icon,
            href: tab.href,
            value: normalizePathname(new URL(tab.href, window.location.origin).pathname),
        };
    });
    const activeTabPathname = tabEntries.reduce<string | undefined>((best, tab) => {
        if (tab.value !== normalizedCurrentPathname && !normalizedCurrentPathname.startsWith(`${tab.value}/`)) {
            return best;
        }

        return best === undefined || tab.value.length > best.length ? tab.value : best;
    }, undefined);
    const { user } = useUserProfile();

    return (
        <TopLayout
            activeTab={activeTabPathname}
            endContent={
                user ? (
                    <UserProfile />
                ) : (
                    <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            Documentation
                            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                        </span>
                    </Link>
                )
            }
            heading={
                brandOnly ? (
                    <Link href={brandHref} label="LongLink home" color="inherit">
                        <Wordmark />
                    </Link>
                ) : (
                    <Breadcrumb />
                )
            }
            height={fillViewport ? 'fill' : 'auto'}
            reserveTabSpace={user === null}
            tabs={tabEntries}
            topNavClassName="min-h-11 px-7"
        >
            {children}
        </TopLayout>
    );
}
