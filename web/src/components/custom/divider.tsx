import { cn } from 'cn';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Separator } from '@/components/shadcn/separator';

/** Separates View content with an optional label and configurable line presentation. */
export function Divider(props: {
    label?: ReactNode;
    variant?: 'subtle' | 'strong';
    orientation?: 'horizontal' | 'vertical';
    isFullBleed?: boolean;
    className?: string;
}) {
    // Use a subtle horizontal separator contained within its parent by default.
    const orientation = props.orientation ?? 'horizontal';
    const hasLabel = props.label != null && props.label !== false && props.label !== true && props.label !== '';
    const labelId = useId();

    return (
        <section
            role="separator"
            aria-orientation={orientation}
            aria-labelledby={hasLabel ? labelId : undefined}
            className={cn(
                'flex shrink-0 items-center gap-3 text-sm text-muted-foreground',
                orientation === 'vertical' ? 'self-stretch flex-col' : 'w-full',
                props.isFullBleed &&
                    (orientation === 'horizontal'
                        ? '-ms-(--container-padding-inline-start) -me-(--container-padding-inline-end) w-auto self-stretch'
                        : '-mt-(--container-padding-block-start) -mb-(--container-padding-block-end)'),
                props.className
            )}
        >
            <Separator
                orientation={orientation}
                aria-hidden="true"
                className={cn('flex-1', props.variant === 'strong' && 'bg-input')}
            />
            {hasLabel && <p id={labelId}>{props.label}</p>}
            {hasLabel && (
                <Separator
                    orientation={orientation}
                    aria-hidden="true"
                    className={cn('flex-1', props.variant === 'strong' && 'bg-input')}
                />
            )}
        </section>
    );
}
