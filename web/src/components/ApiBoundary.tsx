import { useApiError } from '@/lib/errors';
import { useLocation } from 'react-router';
import { PageLoading } from '@/components/Utils';
import { Suspense, type ReactNode } from 'react';
import { Stack } from '@/components/astryx/Stack';
import { Banner } from '@/components/astryx/Banner';
import { Button } from '@/components/astryx/Button';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

/** Shares loading and recoverable errors, resetting failed reads on retry or navigation. */
export function ApiBoundary({
    children,
    fallback = <PageLoading label="Loading page" />,
    fallbackRender,
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
                            <Stack gap={4} padding={6} align="center">
                                <Banner status="error" title="Unable to load this page." />
                                <Button label="Retry" variant="primary" onClick={resetErrorBoundary} />
                            </Stack>
                        ))
                    }
                >
                    <Suspense fallback={fallback}>{children}</Suspense>
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    );
}
