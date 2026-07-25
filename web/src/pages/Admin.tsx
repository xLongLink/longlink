import { Outlet } from 'react-router';
import { useTranslator } from '@astryxdesign/core/i18n';
import { AppWindow, ArrowUpDown, Building2, Database, HardDrive, Users, Wrench } from 'lucide-react';
import Layout from '@/layout/Layout';
import { Auth } from '@/components/Auth';
import { PageContainer } from '@/components/PageContainer';

/** Renders the admin shell with tabbed navigation. */
export default function Admin() {
    const t = useTranslator();

    return (
        <Auth requiredRole="support">
            <Layout
                tabs={{
                    [t('admin.tabs.users')]: { href: '/admin/users', icon: Users },
                    [t('admin.tabs.applications')]: { href: '/admin/applications', icon: AppWindow },
                    [t('admin.tabs.organizations')]: { href: '/admin/organizations', icon: Building2 },
                    [t('admin.tabs.database')]: { href: '/admin/database', icon: Database },
                    [t('admin.tabs.storage')]: { href: '/admin/storage', icon: HardDrive },
                    [t('admin.tabs.compute')]: { href: '/admin/compute', icon: Wrench },
                    [t('admin.tabs.operations')]: { href: '/admin/operations', icon: ArrowUpDown },
                }}
            >
                <PageContainer gap={8}>
                    <Outlet />
                </PageContainer>
            </Layout>
        </Auth>
    );
}
