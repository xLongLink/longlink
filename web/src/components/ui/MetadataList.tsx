import type { ReactNode } from 'react';
import {
    MetadataList as AstryxMetadataList,
    MetadataListItem as AstryxMetadataListItem,
} from '@astryxdesign/core/MetadataList';

/** Lists labeled values without configurable truncation or label geometry. */
export function MetadataList(props: {
    children?: ReactNode;
    columns?: 'multi' | 'single' | number;
    title?: ReactNode;
}) {
    // Keep labeled values in one readable column by default.
    return <AstryxMetadataList {...props} children={props.children} columns={props.columns ?? 'single'} />;
}

/** Displays one labeled value inside a MetadataList. */
export function MetadataListItem(props: { children?: ReactNode; label: string; icon?: ReactNode }) {
    return <AstryxMetadataListItem {...props} children={props.children} />;
}
