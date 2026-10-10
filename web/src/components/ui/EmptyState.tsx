import { EmptyState as AstryxEmptyState } from '@astryxdesign/core/EmptyState';

/** Describes an empty View region without custom decorative slots. */
export function EmptyState(props: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    title: string;
    isCompact?: boolean;
}) {
    // Use the full empty-state presentation unless space is constrained.
    return (
        <AstryxEmptyState
            {...props}
            className={props.hidden ? 'hidden!' : undefined}
            isCompact={props.isCompact ?? false}
        />
    );
}
