import type { ReactNode } from 'react';
import { Text as AstryxText } from '@/components/astryx/Text';

/** Displays View text with Astryx's semantic typography, alignment, wrapping, and truncation controls. */
// SAFETY: Astryx renders absent children as undefined, preserving the View's optional-children contract.
export const Text = AstryxText as (props: {
    children?: ReactNode;
    color?: 'primary' | 'secondary' | 'disabled' | 'placeholder' | 'accent' | 'inherit';
    type?: 'body' | 'large' | 'label' | 'supporting' | 'code' | 'display-1' | 'display-2' | 'display-3' | 'inherit';
    size?: '4xs' | '3xs' | '2xs' | 'xsm' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    display?: 'inline' | 'block';
    as?: 'span' | 'p' | 'div' | 'label' | 'h1' | 'h2' | 'h3';
    maxLines?: number;
    hasTruncateTooltip?: boolean | 'above' | 'below' | 'start' | 'end';
    wordBreak?: 'break-word' | 'break-all';
    textWrap?: 'wrap' | 'nowrap' | 'balance' | 'pretty';
    justify?: 'start' | 'center' | 'end';
    hasCapsize?: boolean;
    hasStrikethrough?: boolean;
    hasTabularNumbers?: boolean;
}) => ReactNode;
