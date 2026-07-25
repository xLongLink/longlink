import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Wordmark } from '@/components/Wordmark';
import { UserProfile } from '@/components/Profile';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageContainer } from '@/components/PageContainer';
import TopLayout from './TopLayout';

type LayoutTab = {
    href: string;
    active?: boolean;
    icon?: LucideIcon;
};

type LayoutProps = {
    tabs?: Record<string, string | LayoutTab>;
    brandOnly?: boolean;
    brandHref?: string;
    children: ReactNode;
};

/** Renders the XML build shell with SDK-specific header chrome. */
export default function Layout({ tabs, brandOnly = false, brandHref = '/organizations', children }: LayoutProps) {
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
    const header = (
        <Stack gap={0}>
            <TopNav
                className="px-7"
                label={t('common.mainNavigation')}
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
                endContent={
                    isSdkMode ? (
                        <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                            {t('common.documentation')}
                        </Link>
                    ) : (
                        <UserProfile />
                    )
                }
            />

            {brandOnly || !resolvedTabs.length ? null : (
                <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                    <TabList
                        aria-label="Section navigation"
                        hasDivider
                        onChange={() => undefined}
                        size="sm"
                        value={activeHref}
                    >
                        {resolvedTabs.map((tab) => {
                            const TabIcon = tab.icon;

                            return (
                                <Tab
                                    key={tab.label}
                                    href={tab.href}
                                    icon={TabIcon ? <TabIcon aria-hidden="true" size={16} /> : undefined}
                                    label={tab.label}
                                    value={tab.href}
                                />
                            );
                        })}
                    </TabList>
                </Stack>
            )}
        </Stack>
    );

    // Keep XML page content aligned within the centered application container.
    return (
        <TopLayout header={header} fullHeight={!brandOnly && resolvedTabs.length > 0}>
            <PageContainer minHeight={isSdkMode ? '100%' : undefined}>{children}</PageContainer>
        </TopLayout>
    );
}
