import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { Stack as AstryxStack, StackItem as AstryxStackItem } from '@astryxdesign/core/Stack';

type StackProps = {
    children?: ReactNode;
    /** Spacing between items. */
    gap?: Spacing;
    padding?: Spacing;
    direction?: 'horizontal' | 'vertical';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
};

/** Arranges View content using the LongLink spacing scale. */
export function Stack(props: StackProps) {
    // Leave structural sizing and advanced styling outside the View contract.
    return (
        <AstryxStack
            {...props}
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
