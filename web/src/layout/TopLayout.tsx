import type { LucideIcon } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { useEffect, useState, type ReactNode } from 'react';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

export type TopLayoutTab = {
    href: string;
    icon?: LucideIcon;
    label: string;
};

type TopLayoutProps = {
    activeTab?: string;
    children: ReactNode;
    endContent: ReactNode;
    heading: ReactNode;
    height?: 'auto' | 'fill';
    tabs?: readonly TopLayoutTab[];
    topNavClassName: string;
};

/** Renders the shared application shell with top navigation. */
function TopLayout({
    activeTab = '',
    children,
    endContent,
    heading,
    height = 'auto',
    tabs = [],
    topNavClassName,
}: TopLayoutProps) {
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
                        label="Main navigation"
                    />

                    {hasTabs ? (
                        <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
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
                                            value={tab.href}
                                        />
                                    );
                                })}
                            </TabList>
                        </Stack>
                    ) : null}
                </Stack>
            }
            variant="wash"
        >
            <Card
                aria-hidden="true"
                className={`pointer-events-none fixed z-0 end-0 bottom-0 start-0 overflow-clip ${isTabFrameExpanded && hasTabs ? 'top-0' : 'top-[var(--appshell-header-height,0px)] border-t-0'}`}
                padding={0}
                variant="transparent"
            >
                <Stack
                    className={isTabFrameExpanded && hasTabs ? undefined : 'px-2 pb-2'}
                    height="100%"
                    padding={isTabFrameExpanded && hasTabs ? 2 : 0}
                >
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className={`pointer-events-none fixed z-30 end-0 bottom-0 start-0 bg-transparent ${isTabFrameExpanded && hasTabs ? 'top-0 border-8' : 'top-[var(--appshell-header-height,0px)] border-x-8 border-b-8 border-t-0'} border-body`}
                padding={0}
                variant="transparent"
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
