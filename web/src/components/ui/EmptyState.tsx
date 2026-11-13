import { NativeEmptyState } from './NativeEmptyState';

/** Describes an empty View region without custom decorative slots. */
export function EmptyState(props: { title: string; isCompact?: boolean }) {
    return <NativeEmptyState title={props.title} isCompact={props.isCompact} />;
}
