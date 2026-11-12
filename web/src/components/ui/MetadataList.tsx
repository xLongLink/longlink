import type { ReactNode } from 'react';
import { Icon, type StoneIconName } from './Icon';
import {
    MetadataList as AstryxMetadataList,
    MetadataListItem as AstryxMetadataListItem,
} from '@/components/astryx/MetadataList';

/** Lists labeled values with optional truncation and label placement. */
export function MetadataList({
    children,
    ...props
}: {
    children?: ReactNode;
    columns?: 'multi' | 'single' | number;
    title?: ReactNode;
    label?: { position: 'start' | 'top'; width?: number | string };
    maxNumOfItems?: number;
    orientation?: 'vertical' | 'horizontal';
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
