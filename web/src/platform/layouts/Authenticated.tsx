import { ApiError } from '@/lib/api';
import type { ReactNode } from 'react';
import Brand from '@/platform/layouts/Brand';
import { Navigate, Outlet } from 'react-router';
import { PageLoading } from '@/components/Utils';
import { Stack } from '@/components/astryx/Stack';
import { Banner } from '@/components/astryx/Banner';
import { Button } from '@/components/astryx/Button';
import { Center } from '@/components/astryx/Center';
import { AuthenticatedUserContext, useCurrentUser } from '@/lib/hooks/use-user';

/** Guards all nested Platform routes behind the shared authentication UI. */
export default function AuthenticatedLayout() {
    const { data: user, isLoading, error, refetch } = useCurrentUser();
    let content: ReactNode;

    // Wait for profile loading before deciding access.
    if (isLoading) {
        content = (
            <>
                <title>LongLink</title>
                <PageLoading label="Loading account" />
            </>
        );
    } else if (error && !(error instanceof ApiError && error.status === 401)) {
        // Keep authenticated users from seeing a sign-in prompt during profile API failures.
        return (
            <Brand>
                <title>Unable to Load Account | LongLink</title>
                <Center minHeight="calc(100dvh - var(--_app-shell-header-height, 0px) - var(--spacing-4))" width="100%">
                    <Stack gap={4} align="center">
                        <Banner status="error" title="Unable to load your account." />
                        <Button label="Retry" onClick={() => void refetch()} variant="primary" />
                    </Stack>
                </Center>
            </Brand>
        );
    } else if (!user) {
        // Keep protected routes focused on authenticated application content.
        content = (
            <>
                <title>LongLink</title>
                <Navigate replace to="/login" />
            </>
        );
    } else {
        // Publish the validated user without creating query observers in protected children.
        content = (
            <AuthenticatedUserContext value={user}>
                <Outlet />
            </AuthenticatedUserContext>
        );
    }

    return (
        <>
            <meta name="robots" content="noindex, nofollow" />
            {content}
        </>
    );
}
