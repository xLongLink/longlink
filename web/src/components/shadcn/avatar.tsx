import { cn } from 'cn';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

export function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            className={cn(
                'relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none',
                className
            )}
            {...props}
        />
    );
}

export function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
    return (
        <AvatarPrimitive.Image
            data-slot="avatar-image"
            className={cn('size-full object-cover', className)}
            {...props}
        />
    );
}

export function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
    return (
        <AvatarPrimitive.Fallback
            data-slot="avatar-fallback"
            className={cn(
                'flex size-full items-center justify-center bg-(--color-neutral) font-medium text-(--color-text-primary) uppercase',
                className
            )}
            {...props}
        />
    );
}
