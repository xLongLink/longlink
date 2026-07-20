import { Outlet } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import Layout from '@/layout/Layout';
import { Auth } from '@/components/Auth';
import { useTranslation } from '@/lib/i18n';

/** Renders the admin shell with tabbed navigation. */
export default function Admin() {
    const { t } = useTranslation();

    return (
        <Auth requiredRole="support">
            <Layout
                tabs={{
                    [t('admin.tabs.users')]: '/admin/users',
                    [t('admin.tabs.applications')]: { href: '/admin/applications', icon: 'viewColumns' },
                    [t('admin.tabs.organizations')]: '/admin/organizations',
                    [t('admin.tabs.database')]: '/admin/database',
                    [t('admin.tabs.storage')]: '/admin/storage',
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
