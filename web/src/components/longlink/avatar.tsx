import { cn } from 'cn';
import * as dicebear from '@dicebear/core';
import { useMemo, useState, type ComponentProps } from 'react';
import waves from '@dicebear/styles/waves.json' with { type: 'json' };
import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };
import { Avatar as AvatarRoot, AvatarImage } from '@/components/shadcn/avatar';

export { AvatarGroup } from '@/components/shadcn/avatar';

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

/* oxlint-disable anti-slop/no-shape-in-symbol-names -- "shape" is the existing public avatar geometry prop. */
interface AvatarProps extends Omit<ComponentProps<typeof AvatarRoot>, 'size'> {
    shape?: 'circle' | 'rounded' | 'square';
    name?: string;
    src?: string | null;
    size?: 'sm' | 'md' | 'lg';
}

/** Uses local Waves fallbacks for rounded avatars and Glyphs for circles and squares. */
export function Avatar({
    className,
    src,
    name,
    size = 'md',
    children,
    shape: geometry = 'circle',
    ...props
}: AvatarProps) {
    /* oxlint-enable anti-slop/no-shape-in-symbol-names */

    // Select fallback artwork from the effective geometry.
    const style = geometry === 'rounded' ? wavesStyle : glyphsStyle;

    // Reuse fixed-seed artwork until its style changes.
    const fallbackSrc = useMemo(() => {
        const avatar = new dicebear.Avatar(style, { seed: 'avatar' });

        return avatar.toDataUri();
    }, [style]);

    // Failed sources do not prevent a new URL or artwork style from loading.
    const [erroredSrc, setErroredSrc] = useState<string>();
    const primarySrc = src?.trim() || undefined;

    const imageSrc = primarySrc && primarySrc !== erroredSrc ? primarySrc : fallbackSrc;

    const accessibleName = name?.trim() || undefined;
    const labelled = Boolean(accessibleName || props['aria-label'] || props['aria-labelledby']);

    return (
        <AvatarRoot
            role={labelled ? 'img' : 'presentation'}
            aria-label={accessibleName}
            aria-hidden={labelled ? undefined : true}
            {...props}
            size={size === 'md' ? 'default' : size}
            className={cn(
                'overflow-hidden [&>[data-slot=avatar-image]]:rounded-[inherit] after:rounded-[inherit]',
                geometry === 'circle' ? 'rounded-full' : geometry === 'rounded' ? 'rounded-lg' : 'rounded-none',
                className
            )}
        >
            <AvatarImage
                key={imageSrc}
                src={imageSrc}
                alt=""
                keepMounted
                onError={() => {
                    if (imageSrc === primarySrc) setErroredSrc(imageSrc);
                }}
            />
            {children}
        </AvatarRoot>
    );
}
