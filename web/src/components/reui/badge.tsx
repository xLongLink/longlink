import { cn } from 'cn';
import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
    [
        'relative inline-flex shrink-0 items-center justify-center w-fit border border-transparent font-medium whitespace-nowrap outline-none transition-shadow',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3'
    ],
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground',
                outline: 'border-border bg-transparent dark:bg-input/32',
                secondary: 'bg-badge-neutral text-badge-neutral-foreground',
                info: 'bg-info text-white',
                success: 'bg-success text-white',
                warning: 'bg-warning text-white',
                destructive: 'bg-destructive text-white',
                focus: 'bg-focus text-focus-foreground',
                invert: 'bg-invert text-invert-foreground',
                'primary-light':
                    'border-primary/10 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-primary',
                'warning-light': 'bg-warning-muted text-warning-foreground',
                'success-light': 'bg-success-muted text-success-foreground',
                'info-light': 'bg-info-muted text-info-foreground',
                'destructive-light': 'bg-destructive-muted text-destructive-foreground',
                'invert-light':
                    'border-invert/15 bg-invert/10 text-foreground dark:border-invert/45 dark:bg-invert/35 dark:text-invert-foreground',
                'focus-light':
                    'border-focus/15 bg-focus/10 text-focus-foreground dark:border-focus/25 dark:bg-focus/15 dark:text-focus',
                'primary-outline': 'bg-background border-border text-primary dark:bg-input/30',
                'warning-outline': 'bg-background border-border text-warning-foreground dark:bg-input/30',
                'success-outline': 'bg-background border-border text-success-foreground dark:bg-input/30',
                'info-outline': 'bg-background border-border text-info-foreground dark:bg-input/30',
                'destructive-outline': 'bg-background border-border text-destructive-foreground dark:bg-input/30',
                'invert-outline': 'bg-background border-border text-invert-foreground dark:bg-input/30',
                'focus-outline': 'bg-background border-border text-focus-foreground dark:bg-input/30'
            },
            size: {
                xs: 'px-1 py-0.25 text-[0.6rem] leading-none h-4 min-w-4 gap-1',
                sm: 'px-1 py-0.25 text-[0.625rem] leading-none h-4.5 min-w-4.5 gap-1',
                default: 'px-1.25 py-0.5 text-xs h-5 min-w-5 gap-1',
                lg: 'px-1.5 py-0.5 text-xs h-5.5 min-w-5.5 gap-1',
                xl: 'px-2 py-0.75 text-sm h-6 min-w-6 gap-1.5'
            },
            /** `default`: active style radius. `full`: pill radius. */
            radius: { default: 'rounded-sm', full: 'rounded-full' }
        },
        defaultVariants: { variant: 'default', size: 'default', radius: 'default' }
    }
);

interface BadgeProps extends useRender.ComponentProps<'span'> {
    variant?: VariantProps<typeof badgeVariants>['variant'];
    size?: VariantProps<typeof badgeVariants>['size'];
    radius?: VariantProps<typeof badgeVariants>['radius'];
}

function Badge({ className, variant, size, radius, render, ...props }: BadgeProps) {
    const defaultProps = { 'data-slot': 'badge', className: cn(badgeVariants({ variant, size, radius, className })) };

    return useRender({ defaultTagName: 'span', render, props: mergeProps<'span'>(defaultProps, props) });
}

export { Badge, type BadgeProps };
