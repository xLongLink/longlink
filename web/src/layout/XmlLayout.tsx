import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Wordmark } from '@/components/Wordmark';
import { UserProfile } from '@/components/Profile';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageContainer } from '@/components/PageContainer';
import TopLayout from './TopLayout';

type XmlLayoutTab = {
    href: string;
    active?: boolean;
    icon?: LucideIcon;
};

type XmlLayoutProps = {
    tabs?: Record<string, string | XmlLayoutTab>;
    brandOnly?: boolean;
    brandHref?: string;
    children: ReactNode;
};

/** Renders the XML build shell with SDK-specific header chrome. */
export default function XmlLayout({ tabs, brandOnly = false, brandHref = '/organizations', children }: XmlLayoutProps) {
    const t = useTranslator();
    const location = useLocation();
    const tabEntries = Object.entries(tabs ?? {});
    const currentPath = `${location.pathname}${location.search}`;
    const isSdkMode = import.meta.env.MODE === 'sdk';

    const resolvedTabs = tabEntries.map(([label, tab]) => {
        const href = typeof tab === 'string' ? tab : tab.href;
        const active = typeof tab === 'string' ? undefined : tab.active;
        const icon = typeof tab === 'string' ? undefined : tab.icon;
        const targetUrl = new URL(href, `${window.location.origin}${location.pathname}`);

        return {
            href,
            icon,
            label,
            isActive: active ?? `${targetUrl.pathname}${targetUrl.search}` === currentPath,
        };
    });
    const activeHref = resolvedTabs.find((tab) => tab.isActive)?.href ?? '';
    // Keep XML page content aligned within the centered application container.
    return (
        <TopLayout
            activeTab={activeHref}
            endContent={
                isSdkMode ? (
                    <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                        {t('common.documentation')}
                    </Link>
                ) : (
                    <UserProfile />
                )
            }
            heading={
                isSdkMode ? (
                    <Link
                        as="a"
                        href="https://longlink.dev"
                        label={t('common.longlinkHome')}
                        color="inherit"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Wordmark />
                    </Link>
                ) : brandOnly ? (
                    <Link href={brandHref} label={t('common.longlinkHome')} color="inherit">
                        <Wordmark />
                    </Link>
                ) : (
                    <Breadcrumb />
                )
            }
            tabs={brandOnly ? [] : resolvedTabs.map((tab) => ({ ...tab, value: tab.href }))}
            topNavClassName="px-7"
        >
            <PageContainer minHeight={isSdkMode ? '100%' : undefined}>{children}</PageContainer>
        </TopLayout>
    );
}
