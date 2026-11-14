import { CircleX } from 'lucide-react';
import { useLocation } from 'react-router';
import { PageLoading } from '@/components/utils';
import { Button } from '@/components/shadcn/button';
import { createQueryRuntime } from '@/lib/react-query';
import { NativeToaster } from '@/components/native-toaster';
import { ApiErrorContext, useApiError } from '@/lib/errors';
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
            <NativeToaster id={toasterId} onReady={runtime.notifications.connect} />
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
                            <div className="flex flex-col items-center gap-4 p-6">
                                <div
                                    role="status"
                                    className="flex max-w-full items-start gap-2 rounded-xl bg-destructive/10 px-4 py-3 font-[inherit] text-destructive-foreground forced-colors:outline forced-colors:outline-offset-[-1px] forced-colors:outline-[CanvasText]"
                                >
                                    <CircleX aria-hidden="true" className="size-5 shrink-0" />
                                    <p className="m-0 min-w-0 text-sm leading-(--text-sm--line-height) font-semibold wrap-anywhere">
                                        Unable to load this page.
                                    </p>
                                </div>
                                <Button type="button" variant="default" onClick={resetErrorBoundary}>
                                    Retry
                                </Button>
                            </div>
                        ))
                    }
                >
                    <Suspense fallback={fallback}>{children}</Suspense>
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    );
}
