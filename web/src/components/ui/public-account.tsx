import { Link } from 'react-router';
import { ProfileMenu } from '@/components/ui/profile';
import { SidebarMenuButton } from '@/components/shadcn/sidebar';
import { AuthenticatedUserContext, useCurrentUser } from '@/lib/hooks/use-user';

/** Keeps public pages usable without requiring an account. */
export function PublicAccount() {
    const { data: user } = useCurrentUser();

    if (user) {
        return (
            <AuthenticatedUserContext value={user}>
                <ProfileMenu />
            </AuthenticatedUserContext>
        );
    }

    return (
        <SidebarMenuButton render={<Link to="/login/" />}>
            <span>Sign In</span>
        </SidebarMenuButton>
    );
}
