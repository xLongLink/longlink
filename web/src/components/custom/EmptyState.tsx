import { useAnnouncement } from './announcement';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/shadcn/empty';

/** Adds semantic headings and scoped result announcements to the native empty-state composition. */
export function EmptyState(props: { title: string; description?: string; headingLevel?: 1 | 3; isCompact?: boolean }) {
    const { root, channel } = useAnnouncement([props.title, props.description].filter(Boolean).join(' '));
    const Heading = props.headingLevel === 1 ? 'h1' : 'h3';

    return (
        <Empty ref={root} className={props.isCompact ? 'gap-2 p-4' : undefined}>
            <EmptyHeader>
                <EmptyTitle>
                    <Heading>{props.title}</Heading>
                </EmptyTitle>
                {props.description && (
                    <EmptyDescription>
                        <p>{props.description}</p>
                    </EmptyDescription>
                )}
            </EmptyHeader>
            <span ref={channel} className="sr-only" role="status" aria-atomic="true" />
        </Empty>
    );
}
