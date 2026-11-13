import { Outlet } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import { adminNavigation } from '@/platform/admin';
import Platform from '@/components/layouts/Platform';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { Breadcrumbs, BreadcrumbItem } from '@/components/breadcrumb/Breadcrumbs';

/** Renders authorized administration within the shared application layouts. */
export default function Admin() {
    const user = useAuthenticatedUser();

    // Hide administrator routes from regular Platform users.
    if (!user.administrator) {
        return <NotFoundLayout />;
    }

    return (
        <Platform
            action={<ProfileMenu />}
            homeHref="/user/organizations"
            breadcrumb={
                <Breadcrumbs>
                    <BreadcrumbItem isCurrent>Admin</BreadcrumbItem>
                </Breadcrumbs>
            }
            tabs={adminNavigation.map(({ icon: Icon, ...tab }) => ({
                ...tab,
                icon: <Icon aria-hidden="true" size={16} />,
            }))}
        >
            <PageContainer gap={8} padding={2}>
                <Outlet />
            </PageContainer>
        </Platform>
    );
}
