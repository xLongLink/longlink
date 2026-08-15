import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useLocation } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Stack } from '@astryxdesign/core/Stack';
import { AppShell } from '@astryxdesign/core/AppShell';
import {
    AppWindow,
    BookOpen,
    Building2,
    Database,
    FileCode2,
    FlaskConical,
    Globe,
    HardDrive,
    Package,
    Rocket,
    ShieldCheck,
    Waypoints,
} from 'lucide-react';
import type { ArticleNavigationGroup } from '@/lib/articles';
import { Wordmark } from '@/components/Wordmark';

const documentationGroups: ArticleNavigationGroup[] = [
    {
        title: 'Overview',
        items: [
            { title: 'Introduction', path: '/docs', icon: createElement(BookOpen, { 'aria-hidden': true, size: 16 }) },
        ],
    },
    {
        title: 'Platform',
        items: [
            {
                title: 'Overview',
                path: '/docs/api',
                icon: createElement(ShieldCheck, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Organizations',
                path: '/docs/api/organizations',
                icon: createElement(Building2, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Applications',
                path: '/docs/api/applications',
                icon: createElement(AppWindow, { 'aria-hidden': true, size: 16 }),
            },
        ],
    },
    {
        title: 'Applications',
        items: [
            { title: 'Overview', path: '/docs/sdk', icon: createElement(Package, { 'aria-hidden': true, size: 16 }) },
            {
                title: 'Environments',
                path: '/docs/sdk/environments',
                icon: createElement(Globe, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Routes',
                path: '/docs/sdk/routes',
                icon: createElement(Waypoints, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Storage',
                path: '/docs/sdk/storage',
                icon: createElement(HardDrive, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Database',
                path: '/docs/sdk/database',
                icon: createElement(Database, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Pages',
                path: '/docs/sdk/pages',
                icon: createElement(FileCode2, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Testing',
                path: '/docs/sdk/testing',
                icon: createElement(FlaskConical, { 'aria-hidden': true, size: 16 }),
            },
            {
                title: 'Building',
                path: '/docs/sdk/building',
                icon: createElement(Rocket, { 'aria-hidden': true, size: 16 }),
            },
        ],
    },
];

/** Renders documentation content with the fixed documentation navigation. */
export function Documentation({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();

    return (
        <AppShell
            contentPadding={0}
            height="auto"
            mobileNav={{ breakpoint: 'lg' }}
            sideNav={
                <SideNav
                    header={
                        <Stack className="-my-2">
                            <Center className="lg:mt-2" height={64} width="100%">
                                <Link href="/" label="LongLink home" color="inherit">
                                    <Wordmark size="heading" />
                                </Link>
                            </Center>
                            <Stack paddingInline={2}>
                                <Divider />
                            </Stack>
                        </Stack>
                    }
                >
                    <Stack paddingInline={2}>
                        {documentationGroups.map((group) => (
                            <SideNavSection key={group.title} title={group.title}>
                                {group.items.map((item) => (
                                    <SideNavItem
                                        key={item.path}
                                        href={item.path}
                                        icon={item.icon}
                                        isSelected={pathname === item.path}
                                        label={item.title}
                                    />
                                ))}
                            </SideNavSection>
                        ))}
                    </Stack>
                </SideNav>
            }
            variant="wash"
        >
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-0 end-0 bottom-0 start-0 top-12 overflow-clip lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-30 end-0 bottom-0 start-0 top-12 border-8 border-body bg-transparent lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            />
            <Stack className="relative z-10" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}
