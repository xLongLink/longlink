import { cn } from 'cn';
import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { Separator } from '@/components/shadcn/separator';

/** Composes decorative separators around an accessible label. Use Separator for an unlabeled line. */
export function Divider({
    label,
    orientation = 'horizontal',
    className,
    ...props
}: Omit<ComponentProps<'div'>, 'children'> & { label: ReactNode; orientation?: 'horizontal' | 'vertical' }) {
    const labelId = useId();

    return (
        <div
            {...props}
            role="separator"
            aria-orientation={orientation}
            aria-labelledby={labelId}
            className={cn(
                'flex shrink-0 items-center gap-3 text-sm text-muted-foreground',
                orientation === 'vertical' ? 'self-stretch flex-col' : 'w-full',
                className
            )}
        >
            <Separator orientation={orientation} aria-hidden="true" className="flex-1" />
            <span id={labelId}>{label}</span>
            <Separator orientation={orientation} aria-hidden="true" className="flex-1" />
        </div>
    );
}
