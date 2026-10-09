import * as dicebear from '@dicebear/core';
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';
import waves from '@dicebear/styles/waves.json' with { type: 'json' };
import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };

// Use a subdued palette for generated user avatars without altering their shapes.
const glyphsStyle = new dicebear.Style({
    ...glyphs,
    colors: {
        ...glyphs.colors,
        glyph: {
            ...glyphs.colors.glyph,
            values: ['#899bb3', '#858aa5', '#8c8c8c', '#8da58b', '#b5a18b', '#b38d94', '#a18eaf'],
        },
    },
});

const wavesStyle = new dicebear.Style(waves);

/* oxlint-disable anti-slop/no-shape-in-symbol-names -- "shape" is the existing public avatar geometry prop. */
type AvatarProps = {
    shape?: undefined | 'circle' | 'rounded' | 'square';
} & {
    name?: string;
    /** Stable identity for generated avatars, independent of the display name. */
    seed?: string;
    /** Organization owners use rounded Waves avatars; user owners retain the supplied geometry or a circle. */
    kind?: 'user' | 'organization';
    src?: string | null;
    alt?: string;
    size?: 'sm' | 'md' | 'lg';
};
/* oxlint-enable anti-slop/no-shape-in-symbol-names */

/** Uses local Waves fallbacks for rounded organization avatars and Glyphs for users. */
export function Avatar({ kind, src, name, seed, ...props }: AvatarProps) {
    // Native pages identify the owner; existing Views may still supply Astryx's geometry prop.
    props.shape = kind === 'organization' ? 'rounded' : (props.shape ?? 'circle');

    // Prefer stable identities and muted Glyphs colors while preserving organization artwork.
    const avatar = new dicebear.Avatar(props.shape === 'rounded' ? wavesStyle : glyphsStyle, {
        seed: seed?.trim() || name?.trim() || 'avatar',
    });

    return (
        <AstryxAvatar
            {...props}
            size={props.size ?? 'md'}
            name={name}
            tooltip={false}
            src={src?.trim() || undefined}
            fallbackSrc={avatar.toDataUri()}
        />
    );
}
