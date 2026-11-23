import { Outlet } from 'react-router';
import { ProfileMenu } from '@/platform/profile';
import { Building2, Settings2 } from 'lucide-react';
import Platform from '@/components/layouts/platform';
import { PageContainer } from '@/components/layouts/page-container';

/** Renders the fixed account navigation around user pages. */
export default function UserLayout() {
    return (
        <Platform
            action={<ProfileMenu />}
            homeHref="/user/organizations"
            tabs={[
                {
                    href: '/user/organizations',
                    icon: <Building2 aria-hidden="true" size={16} />,
                    label: 'Organizations'
                },
                { href: '/user/settings', icon: <Settings2 aria-hidden="true" size={16} />, label: 'Settings' }
            ]}
        >
            <PageContainer>
                <Outlet />
            </PageContainer>
        </Platform>
    );
}
