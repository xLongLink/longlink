import { cn } from 'cn';
import { spacing } from './spacing';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

/** Owns container sizing, semantic surfaces, and optional content centering. */
export function Box({
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    padding,
    paddingInline = padding,
    paddingBlock = padding,
    align,
    justify,
    overflow,
    center = false,
    background = 'none',
    ...props
}: Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> & {
    width?: CSSProperties['width'];
    height?: CSSProperties['height'];
    minWidth?: CSSProperties['minWidth'];
    maxWidth?: CSSProperties['maxWidth'];
    minHeight?: CSSProperties['minHeight'];
    maxHeight?: CSSProperties['maxHeight'];
    padding?: number;
    paddingInline?: number;
    paddingBlock?: number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
    center?: boolean;
    background?: 'none' | 'muted' | 'primary' | 'secondary' | 'outline';
}) {
    return (
        <div
            data-slot="box"
            {...props}
            className={cn(
                'min-w-0',
                (center || align || justify) && 'flex',
                {
                    none: '',
                    muted: 'bg-muted text-foreground',
                    primary: 'bg-primary text-primary-foreground',
                    secondary: 'bg-secondary text-secondary-foreground',
                    outline: 'border border-border bg-transparent text-foreground'
                }[background]
            )}
            style={{
                width,
                height,
                minWidth,
                maxWidth,
                minHeight,
                maxHeight,
                paddingInline: spacing(paddingInline),
                paddingBlock: spacing(paddingBlock),
                alignItems: align ?? (center ? 'center' : undefined),
                justifyContent:
                    justify === 'between'
                        ? 'space-between'
                        : justify === 'around'
                          ? 'space-around'
                          : justify === 'evenly'
                            ? 'space-evenly'
                            : (justify ?? (center ? 'center' : undefined)),
                overflow
            }}
        />
    );
}
