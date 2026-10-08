import { ApiError } from '@/lib/api';
import Brand from '@/platform/layouts/Brand';
import { NoIndex } from '@/components/NoIndex';
import { Navigate, Outlet } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { AuthenticatedUserContext, useCurrentUser } from '@/lib/hooks/use-user';

/** Guards all nested Platform routes behind the shared authentication UI. */
export default function AuthenticatedLayout() {
    const { data: user, isLoading, error, refetch } = useCurrentUser();
    const pageMetadata = <NoIndex title="LongLink" />;

    // Wait for profile loading before deciding access.
    if (isLoading) {
        return pageMetadata;
    }

    // Keep authenticated users from seeing a sign-in prompt during profile API failures.
    if (error && !(error instanceof ApiError && error.status === 401)) {
        return (
            <Brand>
                <NoIndex title="Unable to Load Account | LongLink" />
                <Center minHeight="calc(100dvh - var(--_app-shell-header-height, 0px) - var(--spacing-4))" width="100%">
                    <Stack gap={4} align="center">
                        <Banner status="error" title="Unable to load your account." />
                        <Button label="Retry" onClick={() => void refetch()} variant="primary" />
                    </Stack>
                </Center>
            </Brand>
        );
    }

    // Keep protected routes focused on authenticated application content.
    if (!user) {
        return (
            <>
                {pageMetadata}
                <Navigate replace to="/login" />
            </>
        );
    }

    // Publish the validated user without creating query observers in protected children.
    return (
        <AuthenticatedUserContext value={user}>
            <Outlet />
        </AuthenticatedUserContext>
    );
}
