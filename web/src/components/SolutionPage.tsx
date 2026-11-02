import type { ReactNode } from 'react';
import Platform from '@/components/layouts/Platform';
import { SolutionRuntime } from '@/components/Solution';
import { PageContainer } from '@/components/PageContainer';

/** Composes the shared Solution runtime and page frame with caller-specific title semantics. */
export function SolutionPage({
    action,
    breadcrumb,
    formatTitle,
    navigationBaseUrl,
    viewsUrl,
}: {
    action: ReactNode;
    breadcrumb: ReactNode;
    formatTitle: (title: string | undefined) => string;
    navigationBaseUrl?: string;
    viewsUrl?: string;
}) {
    return (
        <SolutionRuntime navigationBaseUrl={navigationBaseUrl} viewsUrl={viewsUrl}>
            {({ content, isNavigationLoading, tabs, title }) => (
                <Platform action={action} breadcrumb={breadcrumb} isNavigationLoading={isNavigationLoading} tabs={tabs}>
                    <title>{formatTitle(title)}</title>
                    <PageContainer height="100%" minHeight={0} padding={2}>
                        {content}
                    </PageContainer>
                </Platform>
            )}
        </SolutionRuntime>
    );
}
