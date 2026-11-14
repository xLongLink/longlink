import type { ReactNode } from 'react';

export type TextProps = {
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
};
