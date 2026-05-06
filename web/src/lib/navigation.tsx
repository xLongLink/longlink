import { FileTextIcon, type LucideProps } from 'lucide-react';
import { type ComponentType } from 'react';

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
 * Joins path segments without introducing duplicate slashes.
 */
function joinPaths(basePath: string, tabPath: string): string {
    const normalizedBasePath = basePath.replace(/\/+$/, '');
    const normalizedTabPath = tabPath.replace(/^\/+/, '');

    if (!normalizedBasePath) {
        return `/${normalizedTabPath}`;
    }

    return `${normalizedBasePath}/${normalizedTabPath}`;
}

/**
 * Resolves a page icon component for navigation tabs.
 */
const NavigationPageIcon = (): ComponentType<LucideProps> => {
    function ResolvedNavigationPageIcon(props: LucideProps) {
        return <FileTextIcon {...props} />;
    }

    return ResolvedNavigationPageIcon;
};

/**
 * Converts application pages into navigation tab configurations.
 * Each page becomes a tab with its name as label and icon.
 */
export function getAppTabsFromPages(pages: AppNavigationPage[]): NavigationTab[] {
    return pages.map((page) => ({
        value: page.path,
        label: page.name,
        path: page.path,
        icon: NavigationPageIcon(),
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
            return locationPath === (basePath.replace(/\/+$/, '') || '/');
        }
        const tabFullPath = joinPaths(basePath, tabPath);
        return locationPath.startsWith(tabFullPath);
    });

    return matchedTab ?? tabs[0];
}
