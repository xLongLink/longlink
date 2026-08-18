import { Outlet, useParams } from 'react-router';
import { AppWindow, Settings2 } from 'lucide-react';
import { ProfileMenu } from '@/components/Profile';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import Platform from '@/platform/layouts/Platform';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const { organization = '' } = useParams();

    return (
        <Platform
            action={<ProfileMenu user={useAuthenticatedUser()} />}
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
