import type { ReactNode } from 'react';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';

/** Centers one full-page state indicator. */
function PageState({ children }: { children: ReactNode }) {
    return <Center minHeight="70dvh">{children}</Center>;
}

/** Renders a full-page loading indicator. */
export function PageLoading({ label }: { label: string }) {
    return (
        <PageState>
            <Spinner label={label} />
        </PageState>
    );
}

/** Renders a full-page unavailable state. */
export function PageError({ description, title }: { description: string; title: string }) {
    return (
        <PageState>
            <EmptyState description={description} headingLevel={1} title={title} />
        </PageState>
    );
}
