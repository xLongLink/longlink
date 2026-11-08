import { useLocation } from 'react-router';
import Sidebar from '@/components/layouts/Sidebar';
import type { NavigationTab, PlatformProps } from '@/components/layouts/types';

/** Finds the longest platform tab path that matches a pathname. */
function findActiveTab(tabs: readonly NavigationTab[], pathname: string): string | undefined {
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
    let bestTab: NavigationTab | undefined;
    let bestMatchLength = 0;

    // Rank normalized paths while retaining the original tab identity.
    for (const tab of tabs) {
        const tabPathname = tab.href.replace(/\/+$/, '') || '/';

        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) {
            continue;
        }

        if (tabPathname.length > bestMatchLength) {
            bestTab = tab;
            bestMatchLength = tabPathname.length;
        }
    }

    return bestTab?.href;
}

/** Renders sidebar navigation without knowing the route's domain or identity. */
export default function Platform({ activeTab, ...props }: PlatformProps) {
    const { pathname } = useLocation();
    const selectedTab = activeTab ?? findActiveTab(props.tabs, pathname) ?? '';

    return <Sidebar {...props} activeTab={selectedTab} />;
}
