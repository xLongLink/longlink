import { NativeLoading } from '@/components/ui/NativeLoading';
import { NativeEmptyState } from '@/components/ui/NativeEmptyState';

/** Renders a full-page loading indicator. */
export function PageLoading({ label }: { label: string }) {
    return (
        <div className="flex min-h-[70dvh] min-w-0 items-center justify-center">
            <NativeLoading label={label} />
        </div>
    );
}

/** Renders a full-page unavailable state. */
export function PageError({ description, title }: { description: string; title: string }) {
    return (
        <div className="flex min-h-[70dvh] min-w-0 items-center justify-center">
            <NativeEmptyState description={description} headingLevel={1} title={title} />
        </div>
    );
}
