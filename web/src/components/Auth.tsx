import type { ReactElement } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/VStack';
import { ApiError } from '@/lib/api';
import NotFound from '@/platform/NotFound';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { SignInCard } from '@/components/SignInCard';

/** Protects routes and optionally restricts access to Platform administrators. */
export function Auth({
    children,
    requiresAdministrator = false,
}: {
    children: ReactElement;
    requiresAdministrator?: boolean;
}) {
    const { user, isLoading, error, refetch } = useCurrentUser();

    // Wait for profile loading before deciding access.
    if (isLoading) {
        return null;
    }

    // Keep authenticated users from seeing a sign-in prompt during profile API failures.
    if (error && (!(error instanceof ApiError) || error.status !== 401)) {
        return (
            <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
                <VStack gap={4} align="center">
                    <Banner status="error" title={error.message} />
                    <Button label="Retry" onClick={() => void refetch()} variant="primary" />
                </VStack>
            </Center>
        );
    }

    // Show sign-in UI for unauthenticated users.
    if (!user) {
        return (
            <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px))" width="100%">
                <SignInCard />
            </Center>
        );
    }

    // Hide administrator routes from regular Platform users.
    if (requiresAdministrator && !user.administrator) {
        return <NotFound />;
    }

    return children;
}
