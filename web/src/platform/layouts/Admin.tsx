import { Outlet } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { adminNavigation } from '@/platform/navigation';
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
        <Platform action={<ProfileMenu user={user} />} breadcrumb={<PageBreadcrumb />} tabs={adminNavigation}>
            <PageContainer gap={8} padding={2}>
                <Outlet />
            </PageContainer>
        </Platform>
    );
}
