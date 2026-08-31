import { Outlet, useParams } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { AppWindow, Settings2 } from 'lucide-react';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const { organization = '' } = useParams();
    const user = useAuthenticatedUser();

    return (
        <Platform
            action={<ProfileMenu user={user} />}
            breadcrumb={<PageBreadcrumb />}
            tabs={[
                { href: `/orgs/${organization}`, icon: AppWindow, label: 'Applications' },
                { href: `/orgs/${organization}/settings`, icon: Settings2, label: 'Settings' },
            ]}
        >
            <Outlet />
        </Platform>
    );
}
