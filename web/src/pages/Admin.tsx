import { Outlet } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Building2, Database, HardDrive, Users } from 'lucide-react';
import Layout from '@/layout/Layout';
import { Auth } from '@/components/Auth';

/** Renders the admin shell with tabbed navigation. */
export default function Admin() {
    const t = useTranslator();

    return (
        <Auth requiredRole="support">
            <Layout
                tabs={{
                    [t('admin.tabs.users')]: { href: '/admin/users', icon: Users },
                    [t('admin.tabs.applications')]: { href: '/admin/applications', icon: 'viewColumns' },
                    [t('admin.tabs.organizations')]: { href: '/admin/organizations', icon: Building2 },
                    [t('admin.tabs.database')]: { href: '/admin/database', icon: Database },
                    [t('admin.tabs.storage')]: { href: '/admin/storage', icon: HardDrive },
                    [t('admin.tabs.compute')]: { href: '/admin/compute', icon: 'wrench' },
                    [t('admin.tabs.operations')]: { href: '/admin/operations', icon: 'arrowsUpDown' },
                }}
            >
                <Center axis="horizontal" width="100%">
                    <Stack gap={8} maxWidth={1000} width="100%">
                        <Outlet />
                    </Stack>
                </Center>
            </Layout>
        </Auth>
    );
}
