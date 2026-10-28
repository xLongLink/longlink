import { Outlet } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import { Building2, Settings2 } from 'lucide-react';
import Platform from '@/components/layouts/Platform';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';

/** Renders the fixed account navigation around user pages. */
export default function UserLayout() {
    const user = useAuthenticatedUser();

    return (
        <Platform
            action={<ProfileMenu user={user} />}
            tabs={[
                { href: '/user/organizations', icon: Building2, label: 'Organizations' },
                { href: '/user/settings', icon: Settings2, label: 'Settings' },
            ]}
        >
            <Outlet />
        </Platform>
    );
}
