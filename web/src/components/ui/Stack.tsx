import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { Stack as AstryxStack, StackItem as AstryxStackItem } from '@astryxdesign/core/Stack';

type StackProps = {
    children?: ReactNode;
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
    return <AstryxStack {...props} />;
}

/** Controls how one item participates in its surrounding Stack. */
export function StackItem(props: {
    children?: ReactNode;
    size?: 'static' | 'fill';
    isScrollable?: boolean;
    crossAlignSelf?: 'start' | 'center' | 'end' | 'stretch';
}) {
    return <AstryxStackItem {...props} />;
}
