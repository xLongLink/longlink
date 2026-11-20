import { Outlet } from 'react-router';
import { ProfileMenu } from '@/platform/profile';
import { adminNavigation } from '@/platform/admin';
import Platform from '@/components/layouts/platform';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import NotFoundLayout from '@/components/layouts/not-found';
import { useAuthenticatedUser } from '@/platform/hooks/use-user';
import { PageContainer } from '@/components/layouts/page-container';

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
            breadcrumb={<Breadcrumbs items={[{ label: 'Admin' }]} />}
            tabs={adminNavigation.map(({ icon: Icon, ...tab }) => ({
                ...tab,
                icon: <Icon aria-hidden="true" size={16} />
            }))}
        >
            <PageContainer gap={8}>
                <Outlet />
            </PageContainer>
        </Platform>
    );
}
