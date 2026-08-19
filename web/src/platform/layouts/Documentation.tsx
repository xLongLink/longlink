import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Outlet, useLocation } from 'react-router';
import { Divider } from '@astryxdesign/core/Divider';
import { SideLayout } from '@/components/layouts/SideLayout';
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
                                href="/docs/sdk/pages"
                                icon={<FileCode2 aria-hidden size={16} />}
                                isSelected={pathname === '/docs/sdk/pages'}
                                label="Pages"
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
