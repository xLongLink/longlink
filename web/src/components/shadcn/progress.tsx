import { cn } from 'cn';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

export function Progress({ className, children, value, ...props }: ProgressPrimitive.Root.Props) {
    return (
        <ProgressPrimitive.Root
            value={value}
            data-slot="progress"
            className={cn('flex flex-wrap gap-3', className)}
            {...props}
        >
            {children}
            <ProgressTrack>
                <ProgressIndicator />
            </ProgressTrack>
        </ProgressPrimitive.Root>
    );
}

export function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
    return (
        <ProgressPrimitive.Track
            data-slot="progress-track"
            className={cn('relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted', className)}
            {...props}
        />
    );
}

export function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
    return (
        <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className={cn('h-full bg-primary', className)}
            {...props}
        />
    );
}

export function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
    return (
        <ProgressPrimitive.Label
            data-slot="progress-label"
            className={cn('text-sm font-medium', className)}
            {...props}
        />
    );
}

export function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
    return (
        <ProgressPrimitive.Value
            data-slot="progress-value"
            className={cn('ml-auto text-sm text-muted-foreground tabular-nums', className)}
            {...props}
        />
    );
}
