import { cn } from 'cn';
import type { ComponentPropsWithoutRef } from 'react';

export interface TextProps extends Omit<ComponentPropsWithoutRef<'span'>, 'color'> {
    as?: 'span' | 'p';
    maxLines?: number;
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    tone?: 'default' | 'muted' | 'destructive';
    align?: 'start' | 'center' | 'end';
    tabularNums?: boolean;
}

/** Displays text with optional line truncation, inheriting surrounding typography. */
export function Text({
    as: Component = 'span',
    maxLines = 0,
    size,
    weight,
    tone,
    align,
    tabularNums,
    className,
    style,
    ...props
}: TextProps) {
    return (
        <Component
            data-slot="text"
            {...props}
            className={cn(
                size &&
                    {
                        xs: 'text-xs',
                        sm: 'text-sm',
                        base: 'text-base',
                        lg: 'text-lg',
                        xl: 'text-xl',
                        '2xl': 'text-2xl'
                    }[size],
                weight &&
                    { normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold' }[
                        weight
                    ],
                tone &&
                    { default: 'text-foreground', muted: 'text-muted-foreground', destructive: 'text-destructive' }[
                        tone
                    ],
                align && { start: 'block text-start', center: 'block text-center', end: 'block text-end' }[align],
                tabularNums && 'tabular-nums',
                maxLines === 1 && 'block truncate',
                maxLines > 1 && 'line-clamp-1',
                className
            )}
            style={maxLines > 1 ? { WebkitLineClamp: maxLines, ...style } : style}
        />
    );
}
