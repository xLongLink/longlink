import { useId } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useAnnouncement } from './announcement';

/** Displays and announces native loading status without owning its viewport geometry. */
export function NativeLoading({ label }: { label: string }) {
    const labelId = useId();
    const { root, channel } = useAnnouncement(label);

    // Name the progress indicator from the visible label, keeping announcements local.
    return (
        <div
            className="inline-flex flex-col items-center gap-2 text-sm leading-(--text-sm--line-height) font-bold text-foreground"
            ref={root}
        >
            <LoaderCircle
                className="size-5 animate-spin text-primary motion-reduce:animate-none"
                role="progressbar"
                aria-hidden={false}
                aria-labelledby={labelId}
            />
            <span id={labelId}>{label}</span>
            <span ref={channel} className="sr-only" role="status" aria-atomic="true" />
        </div>
    );
}
