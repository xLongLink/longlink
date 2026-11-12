import { Center } from '@/components/astryx/Center';
import { Spinner } from '@/components/astryx/Spinner';
import { EmptyState } from '@/components/astryx/EmptyState';

/** Renders a full-page loading indicator. */
export function PageLoading({ label }: { label: string }) {
    return (
        <Center minHeight="70dvh">
            <Spinner label={label} />
        </Center>
    );
}

/** Renders a full-page unavailable state. */
export function PageError({ description, title }: { description: string; title: string }) {
    return (
        <Center minHeight="70dvh">
            <EmptyState description={description} headingLevel={1} title={title} />
        </Center>
    );
}
