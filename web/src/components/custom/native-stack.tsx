import { cn } from 'cn';
import { spacing } from './layout';
import type { Spacing } from './types';
import { createElement, type CSSProperties, type HTMLAttributes, type Ref } from 'react';

type NativeStackProps = HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'main' | 'section' | 'aside' | 'figure' | 'footer';
    ref?: Ref<HTMLElement>;
    direction?: 'horizontal' | 'vertical';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'center' | 'end' | 'stretch';
    wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
    gap?: Spacing;
    padding?: Spacing;
    paddingInline?: Spacing;
    paddingBlock?: Spacing;
    width?: CSSProperties['width'];
    height?: CSSProperties['height'];
    maxWidth?: CSSProperties['maxWidth'];
    minHeight?: CSSProperties['minHeight'];
};

/** Arranges trusted Platform content without the isolated View API's default gap. */
export function NativeStack({
    as: Component = 'div',
    ref,
    direction = 'vertical',
    justify,
    align,
    wrap,
    gap,
    padding,
    paddingInline = padding,
    paddingBlock = padding,
    width,
    height,
    maxWidth,
    minHeight,
    className,
    style,
    children,
    ...props
}: NativeStackProps) {
    // Leave omitted spacing unset so native utility classes retain control.
    return createElement(
        Component,
        {
            ...props,
            ref,
            className: cn(
                'flex flex-col data-[direction=horizontal]:flex-row data-[justify=start]:justify-start data-[justify=center]:justify-center data-[justify=end]:justify-end data-[justify=between]:justify-between data-[justify=around]:justify-around data-[justify=evenly]:justify-evenly data-[align=start]:items-start data-[align=center]:items-center data-[align=end]:items-end data-[align=stretch]:items-stretch',
                className
            ),
            'data-direction': direction,
            'data-justify': justify,
            'data-align': align,
            style: {
                ...style,
                width: width ?? style?.width,
                height: height ?? style?.height,
                maxWidth: maxWidth ?? style?.maxWidth,
                minHeight: minHeight ?? style?.minHeight,
                gap: gap === undefined ? style?.gap : spacing(gap),
                paddingInline: paddingInline === undefined ? style?.paddingInline : spacing(paddingInline),
                paddingBlock: paddingBlock === undefined ? style?.paddingBlock : spacing(paddingBlock),
                flexWrap: wrap ?? style?.flexWrap
            }
        },
        children
    );
}
