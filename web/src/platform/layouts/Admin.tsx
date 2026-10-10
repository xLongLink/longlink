import { Outlet } from 'react-router';
import Platform from '@/components/layouts/Platform';
import { adminNavigation } from '@/platform/navigation';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { ProfileMenu } from '@/platform/components/Profile';
import { PageBreadcrumb } from '@/platform/components/PageBreadcrumb';

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
