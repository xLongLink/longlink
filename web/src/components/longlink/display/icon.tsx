import { cn } from 'cn';
import * as icons from '@/lib/icons';
import type { ComponentProps } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IconName } from 'lucide-react/dynamic';
import { IconTile } from '@/components/reui/icon-tile';
import type { BadgeProps } from '@/components/longlink/display/badge';
import { TriangleExclamationPoint, createLucideIcon } from 'lucide-react';

// A blank Lucide glyph retains the requested dimensions while an icon loads.
const emptyIcon = createLucideIcon({ size: 24, node: [] });

const iconSizes = { sm: 'size-4', md: 'size-5', lg: 'size-6' };
const tileSizes = { sm: 'sm', md: 'default', lg: 'lg' } as const;
const iconColors = {
    primary: 'text-primary',
    secondary: 'text-secondary-foreground',
    outline: 'text-foreground',
    destructive: 'text-destructive'
};
const solidColors = {
    primary: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border bg-transparent text-foreground',
    destructive: 'bg-destructive text-background'
};

/** Caches on-demand glyphs without suspending the containing page or changing icon dimensions. */
export function Icon({
    icon,
    size = 'md',
    tile,
    variant,
    ...props
}: Omit<ComponentProps<'svg'>, 'size' | 'className'> & {
    icon: IconName;
    size?: 'sm' | 'md' | 'lg';
    tile?: NonNullable<ComponentProps<typeof IconTile>['variant']>;
    variant?: NonNullable<BadgeProps['variant']>;
}) {
    // Share both in-flight work and rendered components for repeated uses of the same icon.
    const { data: component, isError } = useQuery({
        queryKey: ['icon', icon],
        queryFn: async () => {
            const data = await icons.load(icon);

            return createLucideIcon(data);
        },
        staleTime: Infinity,
        gcTime: Infinity,
        retry: 1
    });

    // Keep labeled controls usable even if an icon cannot be loaded.
    const Component = component ?? (isError ? TriangleExclamationPoint : emptyIcon);

    const glyph = (
        <Component
            data-slot="icon"
            data-size={size}
            aria-hidden="true"
            className={cn('shrink-0', iconSizes[size], !tile && variant && iconColors[variant])}
            {...props}
        />
    );

    return tile ? (
        <IconTile
            variant={tile}
            size={tileSizes[size]}
            className={variant ? (tile === 'solid' ? solidColors[variant] : iconColors[variant]) : undefined}
        >
            {glyph}
        </IconTile>
    ) : (
        glyph
    );
}
