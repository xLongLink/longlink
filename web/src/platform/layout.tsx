import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { normalizePathname } from '@/lib/paths';
import { Wordmark } from '@/components/Wordmark';
import { useUserProfile } from '@/hooks/use-user';
import { ProfileMenu } from '@/components/Profile';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import TopLayout, { type TopLayoutTab } from '@/layout/TopLayout';

type PlatformLayoutProps = {
    tabs?: readonly TopLayoutTab[];
    brandOnly?: boolean;
    brandHref?: string;
    fillViewport?: boolean;
    children: ReactNode;
};

/** Renders the Platform shell with either breadcrumbs or brand-only header chrome. */
export default function PlatformLayout({
    tabs = [],
    brandOnly = false,
    brandHref = '/organizations',
    fillViewport = false,
    children,
}: PlatformLayoutProps) {
    const location = useLocation();
    const normalizedCurrentPathname = normalizePathname(location.pathname);
    const activeTabPathname = tabs.reduce<string | undefined>((best, tab) => {
        const tabPathname = normalizePathname(tab.href);
        if (tabPathname !== normalizedCurrentPathname && !normalizedCurrentPathname.startsWith(`${tabPathname}/`)) {
            return best;
        }

        return best === undefined || tabPathname.length > best.length ? tabPathname : best;
    }, undefined);
    const { user } = useUserProfile();

    return (
        <TopLayout
            activeTab={activeTabPathname}
            endContent={
                user ? (
                    <ProfileMenu />
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
                    <PageBreadcrumb />
                )
            }
            height={fillViewport ? 'fill' : 'auto'}
            tabs={tabs}
            topNavClassName="min-h-11 px-7"
        >
            {children}
        </TopLayout>
    );
}
