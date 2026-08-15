import { Outlet } from 'react-router';
import { AppWindow, ArrowUpDown, Building2, Database, HardDrive, Users, Wrench } from 'lucide-react';
import { Auth } from '@/components/Auth';
import PlatformLayout from '@/platform/layout';
import { PageContainer } from '@/components/PageContainer';

/** Renders the authorized admin shell with tabbed navigation. */
export default function Admin() {
    const tabs = [
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/applications', icon: AppWindow, label: 'Applications' },
        { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
        { href: '/admin/database', icon: Database, label: 'Database' },
        { href: '/admin/storage', icon: HardDrive, label: 'Storage' },
        { href: '/admin/compute', icon: Wrench, label: 'Compute' },
        { href: '/admin/operations', icon: ArrowUpDown, label: 'Operations' },
    ] as const;

    return (
        <Auth requiresAdministrator>
            <PlatformLayout tabs={tabs}>
                <PageContainer gap={8}>
                    <Outlet />
                </PageContainer>
            </PlatformLayout>
        </Auth>
    );
}
