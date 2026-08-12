import { Center } from '@astryxdesign/core/Center';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactElement } from 'react';
import { SignInCard } from '@/components/SignInCard';
import { useUserProfile } from '@/hooks/use-user';
import { ApiError } from '@/lib/api';
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
    const { user, isLoading, error, refetch } = useUserProfile();

    // Wait for profile loading before deciding access.
    if (isLoading) {
        return null;
    }

    // Keep authenticated users from seeing a sign-in prompt during profile API failures.
    if (error && (!(error instanceof ApiError) || error.status !== 401)) {
        return (
            <PlatformLayout brandOnly brandHref="/" fillViewport>
                <Center height="100%" width="100%">
                    <VStack gap={4} align="center">
                        <Banner status="error" title={error.message} />
                        <Button label="Retry" onClick={() => void refetch()} variant="primary" />
                    </VStack>
                </Center>
            </PlatformLayout>
        );
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
