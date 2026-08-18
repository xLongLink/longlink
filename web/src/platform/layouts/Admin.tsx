import { Outlet } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { AppWindow, ArrowUpDown, Building2, Database, HardDrive, Users, Wrench } from 'lucide-react';
import { ProfileMenu } from '@/components/Profile';
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';

/** Renders the authorized admin shell with tabbed navigation. */
export default function Admin() {
    const user = useAuthenticatedUser();

    // Hide administrator routes from regular Platform users.
    if (!user.administrator) {
        return <NotFoundLayout />;
    }

    return (
        <TopLayout
            topMenu={
                <Stack>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<ProfileMenu user={user} />}
                        heading={<PageBreadcrumb />}
                        label="Main navigation"
                    />
                    <Navigation
                        tabs={[
                            { href: '/admin/users', icon: Users, label: 'Users' },
                            { href: '/admin/applications', icon: AppWindow, label: 'Applications' },
                            { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
                            { href: '/admin/database', icon: Database, label: 'Database' },
                            { href: '/admin/storage', icon: HardDrive, label: 'Storage' },
                            { href: '/admin/compute', icon: Wrench, label: 'Compute' },
                            { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
                        ]}
                    />
                </Stack>
            }
        >
            <PageContainer gap={8}>
                <Outlet />
            </PageContainer>
        </TopLayout>
    );
}
