import type { LucideIcon } from 'lucide-react';
import {
    BarChart3,
    Boxes,
    FileText,
    GitBranch,
    Layers,
    LayoutGrid,
    Settings,
    Sparkles,
    User,
    Users,
    Wrench,
} from 'lucide-react';

export type NavigationTab = {
    value: string;
    label: string;
    path?: string;
    icon: LucideIcon;
};

const organizationTabs: NavigationTab[] = [
    { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
    { value: 'tools', label: 'Tools', path: 'tools', icon: Wrench },
    { value: 'solutions', label: 'Solutions', path: 'solutions', icon: Layers },
    {
        value: 'workflows',
        label: 'Workflows',
        path: 'workflows',
        icon: GitBranch,
    },
    { value: 'people', label: 'People', path: 'people', icon: Users },
    { value: 'settings', label: 'Settings', path: 'settings', icon: Settings },
];

const defaultAppTabs: NavigationTab[] = [
    { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
    { value: 'data', label: 'Data', path: 'data', icon: FileText },
    { value: 'settings', label: 'Settings', path: 'settings', icon: Settings },
];

const accountTabs: NavigationTab[] = [
    { value: 'profile', label: 'Profile', path: 'profile', icon: User },
    { value: 'viavai', label: 'ViaVai', path: 'viavai', icon: Sparkles },
];

const appTabsByName: Record<string, NavigationTab[]> = {
    viavai: [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        {
            value: 'automations',
            label: 'Automations',
            path: 'automations',
            icon: Sparkles,
        },
        {
            value: 'integrations',
            label: 'Integrations',
            path: 'integrations',
            icon: Boxes,
        },
        {
            value: 'settings',
            label: 'Settings',
            path: 'settings',
            icon: Settings,
        },
    ],
    atlas: [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        { value: 'models', label: 'Models', path: 'models', icon: Layers },
        { value: 'reports', label: 'Reports', path: 'reports', icon: FileText },
        {
            value: 'settings',
            label: 'Settings',
            path: 'settings',
            icon: Settings,
        },
    ],
    pulse: [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        {
            value: 'streams',
            label: 'Streams',
            path: 'streams',
            icon: Sparkles,
        },
        { value: 'alerts', label: 'Alerts', path: 'alerts', icon: Wrench },
        {
            value: 'settings',
            label: 'Settings',
            path: 'settings',
            icon: Settings,
        },
    ],
};

export type TabsConfig = {
    tabs: NavigationTab[];
    basePathSuffix?: string;
};

export function getTabsConfig({
    org,
    app,
}: {
    org?: string;
    app?: string;
}): TabsConfig {
    const appTabs = app ? (appTabsByName[app] ?? defaultAppTabs) : null;
    const tabs = org ? (appTabs ?? organizationTabs) : accountTabs;
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
        viavai: 'ViaVai',
        atlas: 'Atlas',
        pulse: 'Pulse',
    };
    return appNames[value] ?? formatOrganizationName(value);
}

export const NavigationIcon = BarChart3;
