import { AppShell } from '@astryxdesign/core/AppShell';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { TopNav } from '@astryxdesign/core/TopNav';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';
import { ContentFrame } from '@/layout/ContentFrame';

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
    const [isTabFrameExpanded, setIsTabFrameExpanded] = useState(false);

    useEffect(() => {
        if (!hasTabs) {
            return;
        }

        // Expand the fixed frame over tabs once the document starts scrolling.
        function updateTabFrame() {
            setIsTabFrameExpanded(window.scrollY > 0);
        }

        updateTabFrame();
        window.addEventListener('scroll', updateTabFrame, { passive: true });
        return () => window.removeEventListener('scroll', updateTabFrame);
    }, [hasTabs]);

    return (
        <AppShell
            banner={import.meta.env.MODE === 'sdk' ? undefined : <DevelopmentNotice />}
            className="platform-top-layout"
            contentPadding={0}
            height="auto"
            mobileNav={false}
            topNav={
                <Stack gap={0}>
                    <TopNav
                        className={topNavClassName}
                        endContent={endContent}
                        heading={heading}
                        label={t('common.mainNavigation')}
                    />

                    {hasTabs || reserveTabSpace ? (
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
                    ) : null}
                </Stack>
            }
            variant="wash"
        >
            <ContentFrame
                className={`end-0 bottom-0 start-0 ${isTabFrameExpanded && hasTabs ? 'top-0' : 'top-[var(--appshell-header-height,0px)]'}`}
                isConnectedToHeader={!isTabFrameExpanded || !hasTabs}
            />
            <Stack
                className="relative z-10"
                height={height === 'fill' ? 'calc(100dvh - var(--appshell-header-height, 0px))' : 'auto'}
                padding={2}
            >
                {hasTabs && height === 'auto' ? (
                    <Stack minHeight="calc(100dvh - var(--appshell-header-height, 0px) - var(--spacing-12))">
                        {children}
                    </Stack>
                ) : (
                    children
                )}
            </Stack>
        </AppShell>
    );
}

export default TopLayout;
