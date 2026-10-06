import type { ReactNode } from 'react';
import { Icon, type StoneIconName } from './Icon';
import {
    MetadataList as AstryxMetadataList,
    MetadataListItem as AstryxMetadataListItem,
} from '@astryxdesign/core/MetadataList';

/** Lists labeled values without configurable truncation or label geometry. */
export function MetadataList({
    children,
    ...props
}: {
    children?: ReactNode;
    columns?: 'multi' | 'single' | number;
    title?: ReactNode;
}) {
    // Keep labeled values in one readable column by default.
    return (
        <AstryxMetadataList {...props} columns={props.columns ?? 'single'}>
            {children}
        </AstryxMetadataList>
    );
}

/** Displays one labeled value inside a MetadataList. */
export function MetadataListItem({
    children,
    ...props
}: {
    /** Value rendered beside the metadata label. */
    children?: ReactNode;
    /** Label identifying the metadata value. */
    label: string;
    /** Optional icon displayed beside the metadata label. */
    icon?: StoneIconName;
}) {
    // Resolve the registered icon name without changing the metadata content.
    return (
        <AstryxMetadataListItem {...props} icon={props.icon ? <Icon icon={props.icon} size="sm" /> : undefined}>
            {children}
        </AstryxMetadataListItem>
    );
}
