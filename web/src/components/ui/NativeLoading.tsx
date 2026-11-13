import { useId } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useAnnouncement } from './announcement';

/** Displays and announces native loading status without owning its viewport geometry. */
export function NativeLoading({ label }: { label: string }) {
    const labelId = useId();
    const { root, channel } = useAnnouncement(label);

    // Name the progress indicator from the visible label, keeping announcements local.
    return (
        <div className="native-loading" ref={root}>
            <LoaderCircle role="progressbar" aria-hidden={false} aria-labelledby={labelId} />
            <span id={labelId}>{label}</span>
            <span ref={channel} className="sr-only" role="status" aria-atomic="true" />
        </div>
    );
}
