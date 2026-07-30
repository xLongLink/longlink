import { useTranslator } from '@astryxdesign/core/i18n';
import { Outlet } from 'react-router';
import { Auth } from '@/components/Auth';
import { PageContainer } from '@/components/PageContainer';
import { ADMIN_NAVIGATION } from '@/platform/admin/navigation';
import PlatformLayout from '@/platform/layout';

/** Renders the admin shell with tabbed navigation. */
export default function Admin() {
    const t = useTranslator();

    return (
        <Auth requiresAdministrator>
            <PlatformLayout
                tabs={Object.fromEntries(
                    ADMIN_NAVIGATION.map((item) => [t(item.tabLabel), { href: item.href, icon: item.icon }])
                )}
            >
                <PageContainer gap={8}>
                    <Outlet />
                </PageContainer>
            </PlatformLayout>
        </Auth>
    );
}
