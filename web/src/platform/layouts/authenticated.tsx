import { ApiError } from '@/lib/api';
import { CircleX } from 'lucide-react';
import type { ReactNode } from 'react';
import Brand from '@/platform/layouts/brand';
import { Navigate, Outlet } from 'react-router';
import { PageLoading } from '@/components/utils';
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
                <div className="flex min-h-[calc(100dvh-var(--\_app-shell-header-height,0px)-calc(var(--spacing)*4))] w-full items-center justify-center">
                    <div className="flex max-w-full flex-col items-center gap-4">
                        <div
                            role="status"
                            className="flex max-w-full items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 font-[inherit] text-destructive-foreground forced-colors:outline forced-colors:outline-offset-[-1px] forced-colors:outline-[CanvasText]"
                        >
                            <CircleX aria-hidden="true" className="size-5 shrink-0" />
                            <p className="m-0 min-w-0 text-sm leading-(--text-sm--line-height) font-semibold wrap-anywhere">
                                Unable to load your account.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="default"
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
