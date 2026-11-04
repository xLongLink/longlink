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
    hasNavigationError?: boolean;
    homeHref?: string;
    isNavigationLoading?: boolean;
    sidebarHeader?: ReactNode;
    tabs: readonly NavigationTab[];
    topbarHeading?: ReactNode;
};

export type NavigationLayoutProps = Omit<PlatformProps, 'activeTab' | 'hasNavigationError' | 'isNavigationLoading'> & {
    activeTab: string;
};
