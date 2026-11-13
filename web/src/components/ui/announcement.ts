import { useEffect, useRef, useSyncExternalStore } from 'react';

/** Keeps initial statuses silent during hydration/loading, but delivers mounted event feedback immediately. */
export function useAnnouncement(message: string, kind: 'status' | 'event' = 'status') {
    const root = useRef<HTMLDivElement>(null);
    const spoken = useRef<string>(undefined);
    const channel = useRef<HTMLSpanElement>(null);
    const frame = useRef<number | undefined>(undefined);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const client = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    // Keep announcements within the visible region and its accessibility owner.
    useEffect(() => {
        const element = root.current;
        const region = channel.current;

        if (!element || !region) return;

        const retire = () => {
            if (frame.current !== undefined) cancelAnimationFrame(frame.current);
            frame.current = undefined;
            clearTimeout(timer.current);
            region.textContent = '';
        };

        if (element.closest('[hidden], [inert], [aria-hidden="true"]') || element.checkVisibility?.() === false) {
            spoken.current = undefined;
            retire();

            return;
        }

        const text = message.replace(/\s+/g, ' ').trim();

        if (!text) {
            spoken.current = undefined;
            retire();

            return;
        }

        const repeated = spoken.current === text;

        if (client || kind === 'status') spoken.current = text;

        if (
            !client ||
            (kind === 'status' && element.ownerDocument.readyState !== 'complete') ||
            element.parentElement?.closest(
                '[role="log"], [role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]'
            )
        ) {
            retire();

            return;
        }

        if (repeated) return;

        if (frame.current !== undefined) cancelAnimationFrame(frame.current);
        clearTimeout(timer.current);
        frame.current = requestAnimationFrame(() => {
            frame.current = undefined;
            region.textContent = text;
            timer.current = setTimeout(() => {
                region.textContent = '';
            }, 2000);
        });
    });

    // Cancel pending work without suppressing a replayed mount's first announcement.
    useEffect(
        () => () => {
            if (frame.current !== undefined) {
                cancelAnimationFrame(frame.current);
                frame.current = undefined;
                spoken.current = undefined;
            }

            clearTimeout(timer.current);
        },
        []
    );

    return { root, channel };
}
