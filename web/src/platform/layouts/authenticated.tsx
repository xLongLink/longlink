import { ApiError } from '@/lib/api';
import type { ReactNode } from 'react';
import Brand from '@/platform/layouts/brand';
import { Navigate, Outlet } from 'react-router';
import { useCurrentUser } from '@/platform/hooks/use-user';
import { Button } from '@/components/longlink/action/button';
import { PageError, PageLoading } from '@/components/ui/utils';

/** Guards all nested Platform routes behind the shared authentication UI. */
export default function AuthenticatedLayout() {
    const { data: user, isLoading, isFetching, error, refetch } = useCurrentUser();
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
                <PageError title="Unable to load your account.">
                    <Button
                        type="button"
                        variant="primary"
                        disabled={isFetching}
                        focusableWhenDisabled
                        aria-busy={isFetching}
                        onClick={() => void refetch({ cancelRefetch: false })}
                    >
                        Retry
                    </Button>
                </PageError>
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
        content = <Outlet />;
    }

    return (
        <>
            <meta name="robots" content="noindex, nofollow" />
            {content}
        </>
    );
}
