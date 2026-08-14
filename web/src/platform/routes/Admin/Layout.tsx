import { Outlet } from 'react-router';
import { Auth } from '@/components/Auth';
import PlatformLayout from '@/platform/layout';
import { PageContainer } from '@/components/PageContainer';
import { ADMIN_NAVIGATION } from '@/platform/admin/navigation';

/** Renders the authorized admin shell with tabbed navigation. */
export default function AdminLayoutRoute() {
    return (
        <Auth requiresAdministrator>
            <PlatformLayout tabs={[...ADMIN_NAVIGATION]}>
                <PageContainer gap={8}>
                    <Outlet />
                </PageContainer>
            </PlatformLayout>
        </Auth>
    );
}
