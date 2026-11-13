import { useAnnouncement } from '@/components/ui/announcement';

/** Announces a Sonner message through an initially empty, scoped live channel. */
export function NativeNotificationMessage({
    message,
    priority,
}: {
    message: string;
    priority: 'assertive' | 'polite';
}) {
    const { root, channel } = useAnnouncement(message, 'event');

    return (
        <div ref={root}>
            <span>{message}</span>
            <span ref={channel} className="sr-only" aria-live={priority} aria-atomic="true" />
        </div>
    );
}
