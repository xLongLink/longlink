import { useRender } from '@base-ui/react/use-render';
import { mergeProps } from '@base-ui/react/merge-props';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
    [
        'relative inline-flex shrink-0 items-center justify-center w-fit border font-medium whitespace-nowrap outline-none transition-shadow',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3'
    ],
    {
        variants: {
            variant: {
                primary: 'border-transparent bg-primary text-primary-foreground',
                outline: 'border-border bg-transparent text-foreground',
                secondary: 'border-transparent bg-secondary text-secondary-foreground',
                destructive: 'border-transparent bg-red-600/10 text-red-700 dark:bg-red-500/20 dark:text-red-400'
            },
            size: {
                xs: 'px-1 py-0.25 text-[0.6rem] leading-none h-4 min-w-4 gap-1',
                sm: 'px-1 py-0.25 text-[0.625rem] leading-none h-4.5 min-w-4.5 gap-1',
                md: 'px-1.25 py-0.5 text-xs h-5 min-w-5 gap-1',
                lg: 'px-1.5 py-0.5 text-xs h-5.5 min-w-5.5 gap-1',
                xl: 'px-2 py-0.75 text-sm h-6 min-w-6 gap-1.5'
            },
            /** `sm`: active style radius. `full`: pill radius. */
            radius: { sm: 'rounded-sm', full: 'rounded-full' }
        },
        defaultVariants: { variant: 'primary', size: 'md', radius: 'sm' }
    }
);

interface BadgeProps extends Omit<useRender.ComponentProps<'span'>, 'className'> {
    variant?: VariantProps<typeof badgeVariants>['variant'];
    size?: VariantProps<typeof badgeVariants>['size'];
    radius?: VariantProps<typeof badgeVariants>['radius'];
}

function Badge({ variant, size, radius, render, ...props }: BadgeProps) {
    const defaultProps = { 'data-slot': 'badge', className: badgeVariants({ variant, size, radius }) };

    return useRender({ defaultTagName: 'span', render, props: mergeProps<'span'>(defaultProps, props) });
}

export { Badge, type BadgeProps };
