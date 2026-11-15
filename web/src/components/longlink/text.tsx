import { cn } from 'cn';
import type { ComponentPropsWithoutRef } from 'react';

export interface TextProps extends Omit<ComponentPropsWithoutRef<'span'>, 'color'> {
    maxLines?: number;
}

/** Displays a native span with optional line truncation, inheriting surrounding typography. */
export function Text({ maxLines = 0, className, style, ...props }: TextProps) {
    return (
        <span
            data-slot="text"
            {...props}
            className={cn(maxLines === 1 && 'block truncate', maxLines > 1 && 'line-clamp-1', className)}
            style={maxLines > 1 ? { WebkitLineClamp: maxLines, ...style } : style}
        />
    );
}
