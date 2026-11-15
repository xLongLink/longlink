import { cn } from 'cn';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';

/** Owns container sizing and semantic surfaces without arranging its children. */
export function Box({
    width,
    height,
    maxWidth,
    minHeight,
    background = 'none',
    ...props
}: Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> & {
    width?: CSSProperties['width'];
    height?: CSSProperties['height'];
    maxWidth?: CSSProperties['maxWidth'];
    minHeight?: CSSProperties['minHeight'];
    background?: 'none' | 'primary' | 'secondary' | 'outline';
}) {
    return (
        <div
            data-slot="box"
            {...props}
            className={cn(
                'min-w-0',
                {
                    none: '',
                    primary: 'bg-primary text-primary-foreground',
                    secondary: 'bg-secondary text-secondary-foreground',
                    outline: 'border border-border bg-transparent text-foreground'
                }[background]
            )}
            style={{ width, height, maxWidth, minHeight }}
        />
    );
}
