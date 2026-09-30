import * as dicebear from '@dicebear/core';
import type { ComponentProps } from 'react';
import waves from '@dicebear/styles/waves.json' with { type: 'json' };
import glyphs from '@dicebear/styles/glyphs.json' with { type: 'json' };
import { Avatar as AstryxAvatar, type AvatarShape } from '@astryxdesign/core/Avatar';

const glyphsStyle = new dicebear.Style(glyphs);
const wavesStyle = new dicebear.Style(waves);

type AstryxAvatarProps = Omit<ComponentProps<typeof AstryxAvatar>, 'shape' | 'src'>;

interface AvatarProps extends AstryxAvatarProps {
    name?: string;
    shape?: AvatarShape;
    src?: string | null;
}

/** Uses local Waves fallbacks for rounded organization avatars and Glyphs for users. */
export function Avatar({ shape = 'circle', src, name, fallbackSrc, ...props }: AvatarProps) {
    // Generate a stable fallback without sending names to an external avatar service.
    const avatar = new dicebear.Avatar(shape === 'rounded' ? wavesStyle : glyphsStyle, {
        seed: name?.trim() || 'avatar',
    });

    return (
        <AstryxAvatar
            {...props}
            name={name}
            shape={shape}
            src={src?.trim() || undefined}
            fallbackSrc={fallbackSrc ?? avatar.toDataUri()}
        />
    );
}
