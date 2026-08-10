import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageContainer } from '@/components/PageContainer';
import { UserProfile } from '@/components/Profile';
import { Wordmark } from '@/components/Wordmark';
import TopLayout from '@/layout/TopLayout';

type XmlLayoutTab = {
    href: string;
    active?: boolean;
    icon?: LucideIcon;
};

type XmlLayoutProps = {
    tabs?: Record<string, string | XmlLayoutTab>;
    children: ReactNode;
};

/** Renders the XML build shell with SDK-specific header chrome. */
export default function XmlLayout({ tabs = {}, children }: XmlLayoutProps) {
    const t = useTranslator();
    const location = useLocation();
    const currentPath = `${location.pathname}${location.search}`;
    const isSdkMode = import.meta.env.MODE === 'sdk';

    let activeHref = '';
    const resolvedTabs = Object.entries(tabs).map(([label, tab]) => {
        const { href, active, icon }: XmlLayoutTab = typeof tab === 'string' ? { href: tab } : tab;
        const targetUrl = new URL(href, `${window.location.origin}${location.pathname}`);
        const isActive = active ?? `${targetUrl.pathname}${targetUrl.search}` === currentPath;

        if (!activeHref && isActive) activeHref = href;

        return {
            href,
            icon,
            label,
            value: href,
        };
    });

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
                ) : (
                    <Breadcrumb />
                )
            }
            reserveTabSpace={false}
            tabs={resolvedTabs}
            topNavClassName="px-7"
        >
            <PageContainer minHeight={isSdkMode ? '100%' : undefined}>{children}</PageContainer>
        </TopLayout>
    );
}
