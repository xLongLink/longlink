import { AppShell } from '@astryxdesign/core/AppShell';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { TopNav } from '@astryxdesign/core/TopNav';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

type TopLayoutTab = {
    href: string;
    icon?: LucideIcon;
    label: string;
    value: string;
};

type TopLayoutProps = {
    activeTab?: string;
    children: ReactNode;
    endContent: ReactNode;
    heading: ReactNode;
    height?: 'auto' | 'fill';
    reserveTabSpace?: boolean;
    tabs?: TopLayoutTab[];
    topNavClassName: string;
};

/** Renders the shared application shell with top navigation. */
function TopLayout({
    activeTab = '',
    children,
    endContent,
    heading,
    height = 'auto',
    reserveTabSpace = false,
    tabs = [],
    topNavClassName,
}: TopLayoutProps) {
    const t = useTranslator();

    // Preserve the existing top navigation and optional tab-strip structure.
    const hasTabs = tabs.length > 0;
    const topNavigation = (
        <Stack gap={0}>
            <TopNav
                className={topNavClassName}
                endContent={endContent}
                heading={heading}
                label={t('common.mainNavigation')}
            />

            {!hasTabs && !reserveTabSpace ? null : (
                <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                    {hasTabs ? (
                        <TabList
                            aria-label="Section navigation"
                            hasDivider
                            onChange={() => undefined}
                            size="sm"
                            value={activeTab}
                        >
                            {tabs.map((tab) => {
                                const TabIcon = tab.icon;

                                return (
                                    <Tab
                                        key={tab.label}
                                        href={tab.href}
                                        icon={TabIcon ? <TabIcon aria-hidden="true" size={16} /> : undefined}
                                        label={tab.label}
                                        value={tab.value}
                                    />
                                );
                            })}
                        </TabList>
                    ) : (
                        <Stack
                            aria-hidden="true"
                            className="border-b border-border"
                            height="var(--size-element-sm)"
                            width="100%"
                        />
                    )}
                </Stack>
            )}
        </Stack>
    );

    return (
        <AppShell
            banner={import.meta.env.MODE === 'sdk' ? undefined : <DevelopmentNotice />}
            contentPadding={6}
            height={height}
            mobileNav={false}
            topNav={topNavigation}
            variant="elevated"
        >
            {hasTabs && height === 'auto' ? (
                <Stack minHeight="calc(100dvh - var(--appshell-header-height, 0px) - var(--spacing-12))">
                    {children}
                </Stack>
            ) : (
                children
            )}
        </AppShell>
    );
}

export default TopLayout;
