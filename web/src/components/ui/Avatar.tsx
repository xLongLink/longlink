import * as dicebear from '@dicebear/core';
import type { ComponentProps } from 'react';
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';
import waves from '@dicebear/styles/waves.json' with { type: 'json' };
import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };

const glyphsStyle = new dicebear.Style(glyphs);

const wavesStyle = new dicebear.Style(waves);

type AvatarProps = Pick<ComponentProps<typeof AstryxAvatar>, 'shape'> & {
    name?: string;
    kind?: 'user' | 'organization';
    src?: string | null;
    alt?: string;
    size?: 'sm' | 'md' | 'lg';
};

/** Uses local Waves fallbacks for rounded organization avatars and Glyphs for users. */
export function Avatar({ kind, src, name, ...props }: AvatarProps) {
    // Native pages identify the owner; existing Views may still supply Astryx's geometry prop.
    props.shape = kind === 'organization' ? 'rounded' : (props.shape ?? 'circle');

    // Generate a stable fallback without sending names to an external avatar service.
    const avatar = new dicebear.Avatar(props.shape === 'rounded' ? wavesStyle : glyphsStyle, {
        seed: name?.trim() || 'avatar',
    });

    return (
        <AstryxAvatar
            {...props}
            size={props.size ?? 'md'}
            name={name}
            src={src?.trim() || undefined}
            fallbackSrc={avatar.toDataUri()}
        />
    );
}
