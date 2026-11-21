import { Link } from 'react-router';
import { ProfileMenu } from '@/platform/profile';
import { useCurrentUser } from '@/platform/hooks/use-user';
import { SidebarMenuButton } from '@/components/shadcn/sidebar';

/** Keeps public pages usable without requiring an account. */
export function PublicAccount() {
    const { data: user } = useCurrentUser();

    if (user) {
        return <ProfileMenu />;
    }

    return (
        <SidebarMenuButton render={<Link to="/login/" />}>
            <span>Sign In</span>
        </SidebarMenuButton>
    );
}
