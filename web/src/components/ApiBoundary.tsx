import { useLocation } from 'react-router';
import { PageLoading } from '@/components/Utils';
import { Stack } from '@astryxdesign/core/Stack';
import { Suspense, type ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

/** Shares loading and recoverable errors, resetting failed reads on retry or navigation. */
export function ApiBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();

    return (
        <QueryErrorResetBoundary>
            {({ reset }) => (
                <ErrorBoundary
                    onReset={reset}
                    resetKeys={[location.key]}
                    fallbackRender={({ resetErrorBoundary }) => (
                        <Stack gap={4} padding={6} align="center">
                            <Banner status="error" title="Unable to load this page." />
                            <Button label="Retry" variant="primary" onClick={resetErrorBoundary} />
                        </Stack>
                    )}
                >
                    <Suspense fallback={<PageLoading label="Loading page" />}>{children}</Suspense>
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    );
}
