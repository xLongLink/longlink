import { Outlet } from 'react-router';
import { adminNavigation } from '@/platform/admin';
import Platform from '@/components/layouts/platform';
import { ProfileMenu } from '@/components/ui/profile';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import NotFoundLayout from '@/components/layouts/not-found';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageContainer } from '@/components/ui/page-container';

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
            <PageContainer gap={8} padding={2}>
                <Outlet />
            </PageContainer>
        </Platform>
    );
}
