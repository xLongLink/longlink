import { Center } from '@astryxdesign/core/Center';
import type { ReactElement } from 'react';
import { SignInCard } from '@/components/SignInCard';
import { useUserProfile } from '@/hooks/use-user';
import PlatformLayout from '@/platform/layout';
import NotFound from '@/platform/NotFound';

/** Protects routes and optionally restricts access to Platform administrators. */
export function Auth({
    children,
    requiresAdministrator = false,
}: {
    children: ReactElement;
    requiresAdministrator?: boolean;
}) {
    const { user, isLoading } = useUserProfile();

    // Wait for profile loading before deciding access.
    if (isLoading) {
        return null;
    }

    // Show sign-in UI for unauthenticated users.
    if (!user) {
        return (
            <PlatformLayout brandOnly brandHref="/" fillViewport>
                <Center height="100%" width="100%">
                    <SignInCard />
                </Center>
            </PlatformLayout>
        );
    }

    // Hide administrator routes from regular Platform users.
    if (requiresAdministrator && user.role !== 'administrator') {
        return <NotFound />;
    }

    return children;
}
