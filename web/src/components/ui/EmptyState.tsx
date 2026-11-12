import { cn } from 'cn';
import { Empty } from '@/components/shadcn/empty';
import { useAnnounce } from '@astryxdesign/core/hooks';
import { useEffect, useRef, useSyncExternalStore } from 'react';

/** Describes an empty View region without custom decorative slots. */
export function EmptyState(props: { title: string; isCompact?: boolean }) {
    const root = useRef<HTMLDivElement>(null);
    const spoken = useRef<string>(undefined);
    const announce = useAnnounce();

    const client = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    // Announce late or changed empty results without repeating initial page content or enclosing live regions.
    useEffect(() => {
        const element = root.current;

        if (
            !element ||
            element.closest('[hidden], [inert], [aria-hidden="true"]') ||
            element.checkVisibility?.() === false
        ) {
            spoken.current = undefined;

            return;
        }

        const text = props.title.replace(/\s+/g, ' ').trim();

        if (!text || spoken.current === text) return;
        spoken.current = text;

        if (
            !client ||
            element.ownerDocument.readyState !== 'complete' ||
            element.parentElement?.closest(
                '[role="log"], [role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]'
            )
        )
            return;
        announce(text);
    });

    // Use the full empty-state presentation unless space is constrained.
    return (
        <Empty
            ref={root}
            className={cn('w-auto flex-none rounded-none text-wrap', props.isCompact ? 'gap-2 px-4 py-4' : 'px-6 py-8')}
        >
            <h3 className="view-empty-title" data-compact={props.isCompact || undefined}>
                {props.title}
            </h3>
        </Empty>
    );
}
