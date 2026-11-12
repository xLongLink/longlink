import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { Stack as AstryxStack, StackItem as AstryxStackItem } from '@astryxdesign/core/Stack';

type StackProps = {
    children?: ReactNode;
    /** Container width; numbers are pixels and strings are CSS sizes. */
    width?: number | string;
    /** Container height; numbers are pixels and strings are CSS sizes. */
    height?: number | string;
    /** Maximum container width; numbers are pixels and strings are CSS sizes. */
    maxWidth?: number | string;
    /** Minimum container height; numbers are pixels and strings are CSS sizes. */
    minHeight?: number | string;
    /** Spacing between items. */
    gap?: Spacing;
    padding?: Spacing;
    /** Horizontal padding, overriding padding on the inline axis. */
    paddingInline?: Spacing;
    /** Vertical padding, overriding padding on the block axis. */
    paddingBlock?: Spacing;
    /** Optional muted fill or outlined inset surface; omitted stacks remain transparent. */
    background?: 'muted' | 'inset';
    direction?: 'horizontal' | 'vertical';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
};

/** Arranges View content using the LongLink spacing scale. */
export function Stack({ background, ...props }: StackProps) {
    // Apply the optional muted surface without changing layout behavior.
    return (
        <AstryxStack
            {...props}
            className={
                background === 'inset'
                    ? 'rounded-(--radius-container) border border-(--color-border) bg-(--color-background-card)'
                    : background === 'muted'
                      ? 'bg-muted'
                      : undefined
            }
            gap={props.gap ?? 3}
            padding={props.padding ?? 0}
            direction={props.direction ?? 'vertical'}
            justify={props.justify ?? 'start'}
            align={props.align ?? 'stretch'}
            wrap={props.wrap ?? 'nowrap'}
        />
    );
}

/** Controls how one item participates in its surrounding Stack. */
export function StackItem(props: {
    /** Content rendered inside the stack item. */
    children?: ReactNode;
    size?: 'static' | 'fill';
    isScrollable?: boolean;
    /** Overrides this item's cross-axis alignment; omitted values inherit the parent alignment. */
    crossAlignSelf?: 'start' | 'center' | 'end' | 'stretch';
}) {
    // Preserve natural sizing and visible overflow unless explicitly overridden.
    return <AstryxStackItem {...props} size={props.size ?? 'static'} isScrollable={props.isScrollable ?? false} />;
}
