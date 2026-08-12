import { Outlet } from 'react-router';
import { Auth } from '@/components/Auth';
import { PageContainer } from '@/components/PageContainer';
import { ADMIN_NAVIGATION } from '@/platform/admin/navigation';
import PlatformLayout from '@/platform/layout';

/** Renders the admin shell with tabbed navigation. */
export default function Admin() {

    return (
        <Auth requiresAdministrator>
            <PlatformLayout
                tabs={Object.fromEntries(
                    ADMIN_NAVIGATION.map((item) => [item.label, { href: item.href, icon: item.icon }])
                )}
            >
                <PageContainer gap={8}>
                    <Outlet />
                </PageContainer>
            </PlatformLayout>
        </Auth>
    );
}
