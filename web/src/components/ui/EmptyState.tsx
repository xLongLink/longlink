import { EmptyState as AstryxEmptyState } from '@astryxdesign/core/EmptyState';

/** Describes an empty View region without custom decorative slots. */
export function EmptyState(props: { title: string; isCompact?: boolean }) {
    return <AstryxEmptyState {...props} />;
}
