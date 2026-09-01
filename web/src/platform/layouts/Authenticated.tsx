import { ApiError } from '@/lib/api';
import { Link } from '@astryxdesign/core/Link';
import { Navigate, Outlet } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import Platform from '@/platform/layouts/Platform';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { AuthenticatedUserContext, useCurrentUser } from '@/lib/hooks/use-user';

/** Guards all nested Platform routes behind the shared authentication UI. */
export default function AuthenticatedLayout() {
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
                    <Link href="/docs" color="secondary" isStandalone target="_blank">
                        Documentation
                    </Link>
                }
                tabs={[]}
            >
                <Center minHeight="calc(100dvh - var(--_app-shell-header-height, 0px) - var(--spacing-4))" width="100%">
                    <Stack gap={4} align="center">
                        <Banner status="error" title={error.message} />
                        <Button label="Retry" onClick={() => void refetch()} variant="primary" />
                    </Stack>
                </Center>
            </Platform>
        );
    }

    // Keep protected routes focused on authenticated application content.
    if (!user) {
        return <Navigate replace to="/login" />;
    }

    return (
        <AuthenticatedUserContext.Provider value={user}>
            <Outlet />
        </AuthenticatedUserContext.Provider>
    );
}
