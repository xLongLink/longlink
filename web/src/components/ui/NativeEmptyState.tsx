import { cn } from 'cn';
import { useAnnouncement } from './announcement';
import { Empty } from '@/components/shadcn/empty';

/** Shares native empty and unavailable presentation with a scoped announcement channel. */
export function NativeEmptyState(props: {
    title: string;
    description?: string;
    headingLevel?: 1 | 3;
    isCompact?: boolean;
}) {
    const { root, channel } = useAnnouncement([props.title, props.description].filter(Boolean).join(' '));
    const Heading = props.headingLevel === 1 ? 'h1' : 'h3';

    // Use the full empty-state presentation unless space is constrained.
    return (
        <Empty
            ref={root}
            className={cn(
                'w-auto max-w-full flex-none rounded-none text-wrap',
                props.isCompact ? 'gap-2 px-4 py-4' : 'py-8'
            )}
        >
            <div className="native-empty-copy" data-description={props.description ? true : undefined}>
                <Heading className="view-empty-title" data-compact={props.isCompact || undefined}>
                    {props.title}
                </Heading>
                {props.description && <p className="native-empty-description">{props.description}</p>}
            </div>
            <span ref={channel} className="sr-only" role="status" aria-atomic="true" />
        </Empty>
    );
}
