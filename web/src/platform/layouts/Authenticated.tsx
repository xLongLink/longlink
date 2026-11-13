import { ApiError } from '@/lib/api';
import { CircleX } from 'lucide-react';
import type { ReactNode } from 'react';
import '@/platform/layouts/auth.css';
import Brand from '@/platform/layouts/Brand';
import { Navigate, Outlet } from 'react-router';
import { PageLoading } from '@/components/Utils';
import { Button } from '@/components/shadcn/button';
import { AuthenticatedUserContext, useCurrentUser } from '@/lib/hooks/use-user';

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
                <div className="native-auth-center">
                    <div className="native-auth-recovery">
                        <div role="status" className="native-auth-banner">
                            <CircleX aria-hidden="true" className="native-auth-error-icon" />
                            <p>Unable to load your account.</p>
                        </div>
                        <Button
                            type="button"
                            variant="view"
                            data-variant="primary"
                            data-size="md"
                            disabled={isFetching}
                            focusableWhenDisabled
                            aria-busy={isFetching}
                            onClick={() => void refetch({ cancelRefetch: false })}
                        >
                            Retry
                        </Button>
                    </div>
                </div>
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
