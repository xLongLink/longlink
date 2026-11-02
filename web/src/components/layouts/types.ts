import type { ReactElement, ReactNode } from 'react';

export type NavigationTab = {
    href: string;
    icon?: ReactElement;
    label: string;
};

export type PlatformProps = {
    action: ReactNode;
    activeTab?: string;
    breadcrumb?: ReactNode;
    children: ReactNode;
    homeHref?: string;
    isNavigationLoading?: boolean;
    sidebarHeader?: ReactNode;
    tabs: readonly NavigationTab[];
    topbarHeading?: ReactNode;
};

export type NavigationLayoutProps = Omit<PlatformProps, 'activeTab' | 'isNavigationLoading'> & {
    activeTab: string;
};
