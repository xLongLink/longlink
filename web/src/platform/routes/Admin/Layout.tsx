import { Outlet } from 'react-router';
import { Auth } from '@/components/Auth';
import PlatformLayout from '@/platform/layout';
import { ADMIN_NAVIGATION } from '@/platform/navigation';
import { PageContainer } from '@/components/PageContainer';

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
