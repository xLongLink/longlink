import { CircleX } from 'lucide-react';
import { useApiError } from '@/lib/errors';
import { useLocation } from 'react-router';
import { PageLoading } from '@/components/Utils';
import { Suspense, type ReactNode } from 'react';
import { Button } from '@/components/shadcn/button';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

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
                            <div className="api-boundary-error">
                                <div role="status" className="api-boundary-banner">
                                    <CircleX aria-hidden="true" className="api-boundary-icon" />
                                    <p>Unable to load this page.</p>
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
