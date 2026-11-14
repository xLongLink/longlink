import { useAnnouncement } from '@/components/custom/announcement';
import { NativeLoading } from '@/components/custom/native-loading';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/shadcn/empty';

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
    const { root, channel } = useAnnouncement(`${title} ${description}`);

    return (
        <div className="flex min-h-[70dvh] min-w-0 items-center justify-center">
            <Empty ref={root}>
                <EmptyHeader>
                    <EmptyTitle>
                        <h1>{title}</h1>
                    </EmptyTitle>
                    <EmptyDescription>
                        <p>{description}</p>
                    </EmptyDescription>
                </EmptyHeader>
                <span ref={channel} className="sr-only" role="status" aria-atomic="true" />
            </Empty>
        </div>
    );
}
