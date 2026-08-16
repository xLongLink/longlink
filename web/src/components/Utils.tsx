import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';

/** Renders a full-page loading indicator. */
export function PageLoading({ label }: { label: string }) {
    return (
        <Center minHeight="70dvh" width="100%">
            <Spinner label={label} />
        </Center>
    );
}

/** Renders a full-page unavailable state. */
export function PageError({ description, title }: { description: string; title: string }) {
    return (
        <Center minHeight="70dvh" width="100%">
            <EmptyState description={description} headingLevel={1} title={title} />
        </Center>
    );
}
