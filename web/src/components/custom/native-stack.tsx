import { cn } from 'cn';
import { spacing } from './layout';
import type { Spacing } from './types';
import { createElement, type CSSProperties, type HTMLAttributes, type Ref } from 'react';

export type StackLayoutProps = {
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
    background?: 'muted';
};

type NativeStackProps = HTMLAttributes<HTMLElement> &
    StackLayoutProps & { as?: 'div' | 'main' | 'section' | 'aside' | 'figure' | 'footer'; ref?: Ref<HTMLElement> };

/** Arranges native content without View spacing defaults; caller styles override layout props. */
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
    background,
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
                'flex',
                direction === 'horizontal' ? 'flex-row' : 'flex-col',
                justify &&
                    {
                        start: 'justify-start',
                        center: 'justify-center',
                        end: 'justify-end',
                        between: 'justify-between',
                        around: 'justify-around',
                        evenly: 'justify-evenly'
                    }[justify],
                align &&
                    { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }[align],
                background === 'muted' && 'bg-muted',
                className
            ),
            style: {
                width,
                height,
                maxWidth,
                minHeight,
                gap: gap === undefined ? undefined : spacing(gap),
                paddingInline: paddingInline === undefined ? undefined : spacing(paddingInline),
                paddingBlock: paddingBlock === undefined ? undefined : spacing(paddingBlock),
                flexWrap: wrap,
                ...style
            }
        },
        children
    );
}
