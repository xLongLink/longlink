import type { ReactNode } from 'react';
import { Spinner } from '@/components/shadcn/spinner';
import { Empty } from '@/components/longlink/display/empty';

/** Renders a full-page loading indicator. */
export function PageLoading({ label }: { label: string }) {
    return (
        <div className="flex min-h-[70dvh] min-w-0 items-center justify-center">
            <Spinner aria-label={label} className="motion-reduce:animate-none" />
        </div>
    );
}

/** Renders a full-page unavailable state. */
export function PageError({
    description,
    title,
    children
}: {
    description?: string;
    title: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex min-h-[70dvh] min-w-0 items-center justify-center">
            <Empty role="status" aria-atomic="true" title={<h1>{title}</h1>} description={description}>
                {children}
            </Empty>
        </div>
    );
}
