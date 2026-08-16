import type { ReactElement } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/VStack';
import { ApiError } from '@/lib/api';
import NotFound from '@/platform/NotFound';
import { BrandLayout } from '@/platform/layouts/User';
import { useUserProfile } from '@/lib/hooks/use-user';
import { SignInCard } from '@/components/SignInCard';

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
            <BrandLayout brandHref="/" fillViewport>
                <Center height="100%" width="100%">
                    <VStack gap={4} align="center">
                        <Banner status="error" title={error.message} />
                        <Button label="Retry" onClick={() => void refetch()} variant="primary" />
                    </VStack>
                </Center>
            </BrandLayout>
        );
    }

    // Show sign-in UI for unauthenticated users.
    if (!user) {
        return (
            <BrandLayout brandHref="/" fillViewport>
                <Center height="100%" width="100%">
                    <SignInCard />
                </Center>
            </BrandLayout>
        );
    }

    // Hide administrator routes from regular Platform users.
    if (requiresAdministrator && user.role !== 'administrator') {
        return <NotFound />;
    }

    return children;
}
