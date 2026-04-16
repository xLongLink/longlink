import { createElement, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { BarChart3, Blocks, FolderKanban, Settings, Users, Workflow } from 'lucide-react';
import { Icon } from '@/xml/components/Icon';

export type NavigationTab = {
    value: string;
    label: string;
    path?: string;
    icon: ComponentType<LucideProps>;
};

const organizationTabs: NavigationTab[] = [
    { value: 'overview', label: 'Overview', path: 'overview', icon: BarChart3 },
    { value: 'tools', label: 'Tools', path: 'tools', icon: Blocks },
    { value: 'spaces', label: 'Spaces', path: 'spaces', icon: FolderKanban },
    {
        value: 'processes',
        label: 'Processes',
        path: 'processes',
        icon: Workflow,
    },
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

const NavigationPageIcon = ({ name }: { name?: string }): ComponentType<LucideProps> => {
    function ResolvedNavigationPageIcon(props: LucideProps) {
        return createElement(Icon, { name: name || 'file-text', fallback: 'file-text', ...props });
    }

    return ResolvedNavigationPageIcon;
};

export function getAppTabsFromPages(pages: AppNavigationPage[]): NavigationTab[] {
    if (pages.length === 0) {
        return [];
    }

    return pages.map((page) => {
        const path = normalizeTabPath(page.path);

        return {
            value: getTabValue({ path, name: page.name }),
            label: page.name,
            path,
            icon: NavigationPageIcon({ name: page.icon }),
        };
    });
}

export type TabsConfig = {
    tabs: NavigationTab[];
    basePathSuffix?: string;
};

export function getTabsConfig({
    section: _section,
    appId,
    appTabs,
}: {
    section: 'account' | 'organization';
    appId?: string;
    appTabs?: NavigationTab[];
}): TabsConfig {
    const tabs = appId ? (appTabs ?? []) : organizationTabs;
    const basePathSuffix = appId;

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
        .map((segment) => (segment.length > 0 ? segment[0].toUpperCase() + segment.slice(1) : segment))
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
