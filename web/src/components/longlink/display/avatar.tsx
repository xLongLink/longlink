import { cn } from 'cn';
import * as dicebear from '@dicebear/core';
import { useMemo, useState, type ComponentProps } from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import waves from '@dicebear/styles/waves.json' with { type: 'json' };
import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };

// Use a subdued palette for generated user avatars without altering their shapes.
const glyphsStyle = new dicebear.Style({
    ...glyphs,
    colors: {
        ...glyphs.colors,
        glyph: {
            ...glyphs.colors.glyph,
            values: ['#899bb3', '#858aa5', '#8c8c8c', '#8da58b', '#b5a18b', '#b38d94', '#a18eaf']
        }
    }
});

const wavesStyle = new dicebear.Style(waves);

interface AvatarProps extends AvatarPrimitive.Root.Props {
    shape?: 'circle' | 'rounded' | 'square';
    name?: string;
    src?: string | null;
    size?: 'sm' | 'md' | 'lg';
}

/** Uses local Waves fallbacks for rounded avatars and Glyphs for circles and squares. */
export function Avatar({ className, src, name, size = 'md', children, shape = 'circle', ...props }: AvatarProps) {
    // Select fallback artwork from the shape.
    const style = shape === 'rounded' ? wavesStyle : glyphsStyle;

    // Keep generated artwork stable for each name and style.
    const seed = name?.trim() || 'avatar';
    const fallbackSrc = useMemo(() => {
        const avatar = new dicebear.Avatar(style, { seed });

        return avatar.toDataUri();
    }, [style, seed]);

    // Failed sources do not prevent a new URL or artwork style from loading.
    const [erroredSrc, setErroredSrc] = useState<string>();
    const primarySrc = src?.trim() || undefined;

    const imageSrc = primarySrc && primarySrc !== erroredSrc ? primarySrc : fallbackSrc;

    const accessibleName = name?.trim() || undefined;
    const labelled = Boolean(accessibleName || props['aria-label'] || props['aria-labelledby']);

    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            data-size={size}
            role={labelled ? 'img' : 'presentation'}
            aria-label={accessibleName}
            aria-hidden={labelled ? undefined : true}
            {...props}
            className={cn(
                'group/avatar relative flex size-8 shrink-0 overflow-hidden select-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten',
                shape === 'circle' ? 'rounded-full' : shape === 'rounded' ? 'rounded-lg' : 'rounded-none',
                className
            )}
        >
            <AvatarPrimitive.Image
                key={imageSrc}
                data-slot="avatar-image"
                className="aspect-square size-full rounded-[inherit] object-cover"
                src={imageSrc}
                alt=""
                keepMounted
                onError={() => {
                    if (imageSrc === primarySrc) setErroredSrc(imageSrc);
                }}
            />
            {children}
        </AvatarPrimitive.Root>
    );
}

/** Displays overlapping avatars with the shared group styling. */
export function AvatarGroup({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="avatar-group"
            className={cn(
                'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
                className
            )}
            {...props}
        />
    );
}
