import { Outlet } from 'react-router';
import { Building2, Settings2 } from 'lucide-react';
import Platform from '@/components/layouts/platform';
import { ProfileMenu } from '@/components/ui/profile';

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
            <Outlet />
        </Platform>
    );
}
