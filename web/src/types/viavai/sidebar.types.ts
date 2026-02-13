import { type ReactNode } from 'react';

export type SidebarItem = {
    name: string;
    icon: string;
    element: ReactNode;
};

export type SidebarSchemaConfig = {
    title?: string;
    items: SidebarItem[];
};
