import { Blocks, BookOpen, Database, FlaskConical, FileCode2, Globe, HardDrive, LayoutTemplate, Rocket, ServerCog, ShieldCheck, Waypoints } from 'lucide-react';
import { Link } from 'react-router';

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { Wordmark } from '@/components/Wordmark';

export type DocItem = {
    title: string;
    path: string;
    id: string;
    icon: typeof BookOpen;
};

export type DocGroup = {
    title: string;
    items: DocItem[];
};

export const DOC_GROUPS: DocGroup[] = [
    {
        title: 'Overview',
        items: [
            {
                title: 'Introduction',
                path: '/docs',
                id: 'introduction',
                icon: BookOpen,
            },
        ],
    },
    {
        title: 'Control Plane',
        items: [
            {
                title: 'Overview',
                path: '/docs/api',
                id: 'control-plane-overview',
                icon: ShieldCheck,
            },
            {
                title: 'Self Hosted',
                path: '/docs/api/self-hosted',
                id: 'self-hosted',
                icon: ServerCog,
            },
        ],
    },
    {
        title: 'Applications SDK',
        items: [
            {
                title: 'Overview',
                path: '/docs/sdk',
                id: 'sdk-overview',
                icon: Blocks,
            },
            {
                title: 'Environments',
                path: '/docs/sdk/environments',
                id: 'environments',
                icon: Globe,
            },
            {
                title: 'Routes',
                path: '/docs/sdk/routes',
                id: 'routes',
                icon: Waypoints,
            },
            {
                title: 'Storage',
                path: '/docs/sdk/storage',
                id: 'storage',
                icon: HardDrive,
            },
            {
                title: 'Database',
                path: '/docs/sdk/database',
                id: 'database',
                icon: Database,
            },
            {
                title: 'Testing',
                path: '/docs/sdk/testing',
                id: 'testing',
                icon: FlaskConical,
            },
            {
                title: 'Build & Publish',
                path: '/docs/sdk/building',
                id: 'building',
                icon: Rocket,
            },
        ],
    },
    {
        title: 'XML Pages',
        items: [
            {
                title: 'Overview',
                path: '/docs/xml',
                id: 'xml-overview',
                icon: FileCode2,
            },
            {
                title: 'Layout',
                path: '/docs/xml/layout',
                id: 'layout',
                icon: LayoutTemplate,
            },
            {
                title: 'Components',
                path: '/docs/xml/components',
                id: 'components',
                icon: Blocks,
            },
        ],
    },
];

export type DocsSidebarProps = {
    currentItemId?: string;
};

/** Renders the left navigation for the docs experience. */
export function DocsSidebar({ currentItemId }: DocsSidebarProps) {
    return (
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="group-data-[side=left]:border-r-0">
            <SidebarHeader className="h-12 justify-end p-2">
                <Link
                    to="/"
                    className="flex cursor-pointer items-end justify-center gap-2 text-[1.375rem] font-semibold text-card-foreground transition-opacity hover:opacity-80"
                >
                    <Wordmark className="text-base" />
                </Link>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent>
                {DOC_GROUPS.map((group) => (
                    <SidebarGroup key={group.title} className="px-2 py-1">
                        <SidebarGroupLabel className="text-muted-foreground font-normal">{group.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = currentItemId === item.id;

                                    return (
                                        <SidebarMenuItem key={item.id}>
                                            <SidebarMenuButton
                                                render={<Link to={item.path} />}
                                                isActive={isActive}
                                                variant={isActive ? 'outline' : 'default'}
                                                className="text-sidebar-foreground/70 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground"
                                            >
                                                <item.icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                                                {item.title}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
