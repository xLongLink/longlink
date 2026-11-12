import { cn } from 'cn';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

export function Progress(props: ProgressPrimitive.Root.Props) {
    return <ProgressPrimitive.Root data-slot="progress" {...props} />;
}

export function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
    return (
        <ProgressPrimitive.Track
            data-slot="progress-track"
            className={cn('relative h-2 w-full overflow-hidden rounded-full bg-(--color-background-muted)', className)}
            {...props}
        />
    );
}

export function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
    return (
        <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className={cn('h-full rounded-full bg-(--color-accent)', className)}
            {...props}
        />
    );
}
