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
    sidebarHeader?: ReactNode;
    tabs: readonly NavigationTab[];
};

export type NavigationLayoutProps = Omit<PlatformProps, 'activeTab'> & {
    activeTab: string;
};
