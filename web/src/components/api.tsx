import { useLocation } from 'react-router';
import { Toaster } from '@/components/shadcn/sonner';
import { createQueryRuntime } from '@/lib/react-query';
import { ApiErrorContext, useApiError } from '@/lib/errors';
import { Button } from '@/components/longlink/action/button';
import { PageError, PageLoading } from '@/components/ui/utils';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Suspense, useEffect, useId, useState, type ReactNode } from 'react';
import { createNotifications, NotificationContext } from '@/lib/notifications';
import { QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query';

/** Connects cache and direct-request failures to the notification layer. */
export function ApiProvider({ children }: { children: ReactNode }) {
    const toasterId = useId();

    // Keep notifications and deduplication local to this document's API runtime.
    const [runtime] = useState(() => {
        const notifications = createNotifications(toasterId);
        const query = createQueryRuntime(notifications.notify, import.meta.env.MODE !== 'sdk', notifications.dismiss);

        return { ...query, notifications };
    });

    // Late direct requests must not publish after this provider unmounts.
    useEffect(() => {
        runtime.notifications.activate();

        return runtime.notifications.dispose;
    }, [runtime]);

    return (
        <ApiErrorContext value={runtime.reportError}>
            <NotificationContext value={runtime.notifications.showMessage}>
                <QueryClientProvider client={runtime.client}>{children}</QueryClientProvider>
            </NotificationContext>
            <Toaster id={toasterId} closeButton />
        </ApiErrorContext>
    );
}

/** Shares loading and recoverable errors, resetting failed reads on retry or navigation. */
export function ApiBoundary({
    children,
    fallback = <PageLoading label="Loading page" />,
    fallbackRender
}: {
    children: ReactNode;
    fallback?: ReactNode;
    fallbackRender?: (props: FallbackProps) => ReactNode;
}) {
    const location = useLocation();
    const reportError = useApiError();

    return (
        <QueryErrorResetBoundary>
            {({ reset }) => (
                <ErrorBoundary
                    onError={reportError}
                    onReset={reset}
                    resetKeys={[location.key]}
                    fallbackRender={
                        fallbackRender ??
                        (({ resetErrorBoundary }) => (
                            <PageError title="Unable to load this page.">
                                <Button type="button" variant="primary" onClick={resetErrorBoundary}>
                                    Retry
                                </Button>
                            </PageError>
                        ))
                    }
                >
                    <Suspense fallback={fallback}>{children}</Suspense>
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    );
}
