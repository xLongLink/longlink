import { Outlet } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { AppWindow, ArrowUpDown, Building2, Database, HardDrive, Users, Wrench } from 'lucide-react';

/** Renders the authorized admin shell with tabbed navigation. */
export default function Admin() {
    const user = useAuthenticatedUser();

    // Hide administrator routes from regular Platform users.
    if (!user.administrator) {
        return <NotFoundLayout />;
    }

    return (
        <Platform
            action={<ProfileMenu user={user} />}
            breadcrumb={<PageBreadcrumb />}
            tabs={[
                { href: '/admin/users', icon: Users, label: 'Users' },
                { href: '/admin/applications', icon: AppWindow, label: 'Applications' },
                { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
                { href: '/admin/database', icon: Database, label: 'Database' },
                { href: '/admin/storage', icon: HardDrive, label: 'Storage' },
                { href: '/admin/compute', icon: Wrench, label: 'Compute' },
                { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
            ]}
        >
            <PageContainer gap={8} padding={2}>
                <Outlet />
            </PageContainer>
        </Platform>
    );
}
