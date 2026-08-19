import { ApiError } from '@/lib/api';
import { Navigate } from 'react-router';
import type { ReactElement } from 'react';
import { Link } from '@astryxdesign/core/Link';
import Platform from '@/platform/layouts/Platform';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { VStack } from '@astryxdesign/core/VStack';
import { useCurrentUser } from '@/lib/hooks/use-user';

/** Protects routes behind the current user query. */
export function Auth({ children }: { children: ReactElement }) {
    const { user, isLoading, error, refetch } = useCurrentUser();

    // Wait for profile loading before deciding access.
    if (isLoading) {
        return null;
    }

    // Keep authenticated users from seeing a sign-in prompt during profile API failures.
    if (error && (!(error instanceof ApiError) || error.status !== 401)) {
        return (
            <Platform
                action={
                    <Link href="/docs" color="secondary" isStandalone rel="noopener noreferrer" target="_blank">
                        Documentation
                    </Link>
                }
                tabs={[]}
            >
                <Center minHeight="calc(100dvh - var(--appshell-header-height, 0px) - var(--spacing-4))" width="100%">
                    <VStack gap={4} align="center">
                        <Banner status="error" title={error.message} />
                        <Button label="Retry" onClick={() => void refetch()} variant="primary" />
                    </VStack>
                </Center>
            </Platform>
        );
    }

    // Keep protected routes focused on authenticated application content.
    if (!user) {
        return <Navigate replace to="/login" />;
    }

    return children;
}
