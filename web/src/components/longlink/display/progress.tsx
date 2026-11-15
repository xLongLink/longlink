import type { ReactNode } from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

/** Displays progress with an optional label and formatted or custom value. */
export function Progress({
    value,
    label,
    showValue = false,
    valueText,
    ...props
}: Omit<ProgressPrimitive.Root.Props, 'children' | 'className' | 'style' | 'format'> & {
    label?: ReactNode;
    showValue?: boolean;
    valueText?: ReactNode;
}) {
    return (
        <ProgressPrimitive.Root value={value} data-slot="progress" className="flex w-full flex-wrap gap-3" {...props}>
            {label != null && (
                <ProgressPrimitive.Label data-slot="progress-label" className="text-sm font-medium">
                    {label}
                </ProgressPrimitive.Label>
            )}
            {(showValue || valueText != null) && (
                <ProgressPrimitive.Value
                    data-slot="progress-value"
                    className="ms-auto text-sm text-muted-foreground tabular-nums"
                >
                    {valueText === undefined ? undefined : () => valueText}
                </ProgressPrimitive.Value>
            )}
            <ProgressPrimitive.Track
                data-slot="progress-track"
                className="relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted"
            >
                <ProgressPrimitive.Indicator data-slot="progress-indicator" className="h-full bg-primary" />
            </ProgressPrimitive.Track>
        </ProgressPrimitive.Root>
    );
}
