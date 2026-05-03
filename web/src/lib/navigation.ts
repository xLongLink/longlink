import { createElement, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { Icon } from '@/xml/components/Icon';

export type NavigationTab = {
    value: string;
    label: string;
    path?: string;
    icon: ComponentType<LucideProps>;
};

export type PageInfo = {
    name: string;
    path: string;
    icon: string;
};

export type AppNavigationPage = {
    path: string;
    name: string;
    icon?: string;
};

/**
 * Resolves a page icon component for navigation tabs.
 */
const NavigationPageIcon = ({ name }: { name?: string }): ComponentType<LucideProps> => {
    /* Wrap the XML icon renderer so tabs can reuse app icon names. */
    function ResolvedNavigationPageIcon(props: LucideProps) {
        return createElement(Icon, { name: name || 'file-text', fallback: 'file-text', ...props });
    }

    return ResolvedNavigationPageIcon;
};

/**
 * Converts application pages into navigation tab configurations.
 * Each page becomes a tab with its name as label and icon.
 */
export function getAppTabsFromPages(pages: AppNavigationPage[]): NavigationTab[] {
    if (pages.length === 0) {
        return [];
    }

    return pages.map((page) => ({
        value: page.path,
        label: page.name,
        path: page.path,
        icon: NavigationPageIcon({ name: page.icon }),
    }));
}

/**
 * Determines the active navigation tab based on current location path.
 * Matches the first tab whose path prefixes the location, falling back to the first tab.
 */
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

/**
 * Formats an organization slug into a title-case display name.
 * Splits on hyphens and capitalizes each segment.
 */
export function formatOrganizationName(value: string) {
    return value
        .split('-')
        .map((segment) => (segment.length > 0 ? segment[0].toUpperCase() + segment.slice(1) : segment))
        .join(' ');
}
