import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
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

/** Renders documentation content with the fixed documentation navigation. */
export default function Documentation() {
    const { pathname } = useLocation();

    return (
        <SideLayout
            sideNav={
                <SideNav header={<SideNavHeader />}>
                    <Stack paddingInline={2}>
                        <SideNavSection title="Overview">
                            <SideNavItem
                                href="/docs"
                                icon={<BookOpen aria-hidden size={16} />}
                                isSelected={pathname === '/docs'}
                                label="Introduction"
                            />
                        </SideNavSection>
                        <SideNavSection title="Platform">
                            <SideNavItem
                                href="/docs/api"
                                icon={<ShieldCheck aria-hidden size={16} />}
                                isSelected={pathname === '/docs/api'}
                                label="Overview"
                            />
                            <SideNavItem
                                href="/docs/api/organizations"
                                icon={<Building2 aria-hidden size={16} />}
                                isSelected={pathname === '/docs/api/organizations'}
                                label="Organizations"
                            />
                            <SideNavItem
                                href="/docs/api/applications"
                                icon={<AppWindow aria-hidden size={16} />}
                                isSelected={pathname === '/docs/api/applications'}
                                label="Applications"
                            />
                        </SideNavSection>
                        <SideNavSection title="Applications">
                            <SideNavItem
                                href="/docs/sdk"
                                icon={<Package aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk'}
                                label="Overview"
                            />
                            <SideNavItem
                                href="/docs/sdk/environments"
                                icon={<Globe aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/environments'}
                                label="Environments"
                            />
                            <SideNavItem
                                href="/docs/sdk/routes"
                                icon={<Waypoints aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/routes'}
                                label="Routes"
                            />
                            <SideNavItem
                                href="/docs/sdk/storage"
                                icon={<HardDrive aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/storage'}
                                label="Storage"
                            />
                            <SideNavItem
                                href="/docs/sdk/database"
                                icon={<Database aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/database'}
                                label="Database"
                            />
                            <SideNavItem
                                href="/docs/sdk/views"
                                icon={<FileCode2 aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/views'}
                                label="Views"
                            />
                            <SideNavItem
                                href="/docs/sdk/testing"
                                icon={<FlaskConical aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/testing'}
                                label="Testing"
                            />
                            <SideNavItem
                                href="/docs/sdk/building"
                                icon={<Rocket aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/building'}
                                label="Building"
                            />
                        </SideNavSection>
                    </Stack>
                </SideNav>
            }
        >
            <Outlet />
        </SideLayout>
    );
}
