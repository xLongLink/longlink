import type { LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';

type NavigationTab = {
    href: string;
    icon?: LucideIcon;
    label: string;
};

/** Finds the longest navigation path that matches a pathname. */
function findActiveTab(tabs: readonly NavigationTab[], pathname: string): string | undefined {
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

    return tabs.reduce<string | undefined>((best, tab) => {
        const tabPathname = tab.href.replace(/\/+$/, '') || '/';
        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) {
            return best;
        }

        return best === undefined || tabPathname.length > best.length ? tabPathname : best;
    }, undefined);
}

/** Renders tab navigation and selects the tab matching the current route. */
export function Navigation({ tabs }: { tabs: readonly NavigationTab[] }) {
    return (
        <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
            <TabList
                aria-label="Section navigation"
                hasDivider
                onChange={() => undefined}
                size="sm"
                value={findActiveTab(tabs, useLocation().pathname) ?? ''}
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;

                    return (
                        <Tab
                            key={tab.href}
                            href={tab.href}
                            icon={Icon ? <Icon aria-hidden="true" size={16} /> : undefined}
                            label={tab.label}
                            value={tab.href}
                        />
                    );
                })}
            </TabList>
        </Stack>
    );
}
