import { Outlet } from 'react-router';
import { Building2, Settings2 } from 'lucide-react';
import { ProfileMenu } from '@/components/Profile';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import Platform from '@/platform/layouts/Platform';

/** Renders the fixed account navigation around user pages. */
export default function UserLayout() {
    return (
        <Platform
            action={<ProfileMenu user={useAuthenticatedUser()} />}
            tabs={[
                { href: '/user/organizations', icon: Building2, label: 'Organizations' },
                { href: '/user/settings', icon: Settings2, label: 'Settings' },
            ]}
        >
            <Outlet />
        </Platform>
    );
}
