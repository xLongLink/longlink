import { Center } from '@astryxdesign/core/Center';
import type { ReactElement } from 'react';
import { SignInCard } from '@/components/SignInCard';
import { useUserProfile } from '@/hooks/use-user';
import { hasMinimumRole, type PlatformRole } from '@/lib/roles';
import PlatformLayout from '@/platform/layout';
import NotFound from '@/platform/NotFound';

/** Protects routes and optionally requires a platform role. */
export function Auth({ children, requiredRole }: { children: ReactElement; requiredRole?: PlatformRole }) {
    const { user, role, isLoading } = useUserProfile();

    // Wait for profile loading before deciding access.
    if (isLoading) {
        return null;
    }

    // Show sign-in UI for unauthenticated users.
    if (!user) {
        return (
            <PlatformLayout brandOnly brandHref="/" fillViewport reserveTabSpace>
                <Center height="100%" width="100%">
                    <SignInCard />
                </Center>
            </PlatformLayout>
        );
    }

    // Check role requirements only when a route declares one.
    if (requiredRole) {
        // Hide routes from users without the required role.
        if (!hasMinimumRole(role, requiredRole)) {
            return <NotFound />;
        }
    }

    return children;
}
