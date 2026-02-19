import type { LucideIcon } from 'lucide-react';
import {
    BarChart3,
    FileText,
    FolderKanban,
    Settings,
    Users,
} from 'lucide-react';

// import { getIconByName } from '@/components/Icon';

export type NavigationTab = {
    value: string;
    label: string;
    path?: string;
    icon: LucideIcon;
};

const organizationTabs: NavigationTab[] = [
    { value: 'apps', label: 'Apps', path: 'apps', icon: FolderKanban },
    { value: 'people', label: 'People', path: 'people', icon: Users },
    { value: 'settings', label: 'Settings', path: 'settings', icon: Settings },
];

export type AppNavigationPage = {
    path: string;
    name: string;
    icon?: string;
};

const normalizeTabPath = (path: string) => path.replace(/^\/+|\/+$/g, '');

const getTabValue = ({ path, name }: { path: string; name: string }) => {
    if (path.length > 0) {
        return path;
    }

    return name.toLowerCase().replace(/\s+/g, '-');
};

export function getAppTabsFromPages(
    pages: AppNavigationPage[]
): NavigationTab[] {
    if (pages.length === 0) {
        return [];
    }

    return pages.map((page) => {
        const path = normalizeTabPath(page.path);
        const icon = FileText;

        return {
            value: getTabValue({ path, name: page.name }),
            label: page.name,
            path,
            icon,
        };
    });
}

export type TabsConfig = {
    tabs: NavigationTab[];
    basePathSuffix?: string;
};

export function getTabsConfig({
    section: _section,
    app,
    appTabs,
}: {
    section: 'account' | 'organization';
    app?: string;
    appTabs?: NavigationTab[];
}): TabsConfig {
    const tabs = app ? (appTabs ?? []) : organizationTabs;
    const basePathSuffix = app ? `apps/${app}` : undefined;

    return { tabs, basePathSuffix };
}

export function getActiveTabConfig({
    tabs,
    locationPath,
    basePath,
}: {
    tabs: NavigationTab[];
    locationPath: string;
    basePath: string;
}): NavigationTab | undefined {
    const matchedTab = tabs.find((tab) => {
        const tabPath = tab.path ?? '';
        if (tabPath === '') {
            return locationPath === (basePath || '/');
        }
        const tabFullPath = basePath ? `${basePath}/${tabPath}` : `/${tabPath}`;
        return locationPath.startsWith(tabFullPath);
    });

    return matchedTab ?? tabs[0];
}

export function formatOrganizationName(value: string) {
    return value
        .split('-')
        .map((segment) =>
            segment.length > 0
                ? segment[0].toUpperCase() + segment.slice(1)
                : segment
        )
        .join(' ');
}

export function formatAppName(value: string) {
    const appNames: Record<string, string> = {
        longlink: 'Longlink',
        atlas: 'Atlas',
        pulse: 'Pulse',
    };
    return appNames[value] ?? formatOrganizationName(value);
}

export const NavigationIcon = BarChart3;
