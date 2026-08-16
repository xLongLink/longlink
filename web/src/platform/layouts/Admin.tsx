import { Outlet, useLocation } from 'react-router';
import { AppWindow, ArrowUpDown, Building2, Database, ExternalLink, HardDrive, Users, Wrench } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Auth } from '@/components/Auth';
import { ProfileMenu } from '@/components/Profile';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { PageContainer } from '@/components/PageContainer';
import Platform from '@/components/layouts/Platform';
import { useUserProfile } from '@/lib/hooks/use-user';
import { normalizePathname } from '@/lib/paths';

/** Renders the authorized admin shell with tabbed navigation. */
export default function Admin() {
    const { pathname } = useLocation();
    const { user } = useUserProfile();
    const tabs = [
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/applications', icon: AppWindow, label: 'Applications' },
        { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
        { href: '/admin/database', icon: Database, label: 'Database' },
        { href: '/admin/storage', icon: HardDrive, label: 'Storage' },
        { href: '/admin/compute', icon: Wrench, label: 'Compute' },
        { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
    ] as const;
    const normalizedPathname = normalizePathname(pathname);
    const activeTab = tabs.reduce<string | undefined>((best, tab) => {
        const tabPathname = normalizePathname(tab.href);
        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) {
            return best;
        }

        return best === undefined || tabPathname.length > best.length ? tabPathname : best;
    }, undefined);

    return (
        <Auth requiresAdministrator>
            <Platform
                topNav={
                    <Stack gap={0}>
                        <TopNav
                            className="min-h-11 px-7"
                            endContent={
                                user ? (
                                    <ProfileMenu />
                                ) : (
                                    <Link
                                        href="/docs"
                                        color="secondary"
                                        isStandalone
                                        rel="noopener noreferrer"
                                        target="_blank"
                                    >
                                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                            Documentation
                                            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                                        </span>
                                    </Link>
                                )
                            }
                            heading={<PageBreadcrumb />}
                            label="Main navigation"
                        />
                        <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                            <TabList
                                aria-label="Section navigation"
                                hasDivider
                                onChange={() => undefined}
                                size="sm"
                                value={activeTab ?? ''}
                            >
                                {tabs.map((tab) => {
                                    const TabIcon = tab.icon;

                                    return (
                                        <Tab
                                            key={tab.label}
                                            href={tab.href}
                                            icon={<TabIcon aria-hidden="true" size={16} />}
                                            label={tab.label}
                                            value={tab.href}
                                        />
                                    );
                                })}
                            </TabList>
                        </Stack>
                    </Stack>
                }
            >
                <PageContainer gap={8}>
                    <Outlet />
                </PageContainer>
            </Platform>
        </Auth>
    );
}
