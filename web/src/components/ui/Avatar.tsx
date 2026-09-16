import type { ComponentProps } from 'react';
import { Avatar as AstryxAvatar, type AvatarShape } from '@astryxdesign/core/Avatar';

type AstryxAvatarProps = Omit<ComponentProps<typeof AstryxAvatar>, 'shape' | 'src'>;

interface AvatarProps extends AstryxAvatarProps {
    name?: string;
    shape?: AvatarShape;
    src?: string | null;
}

/** Renders an Astryx avatar with an explicit shape, normalizing null sources to undefined. */
export function Avatar({ shape = 'circle', src, ...props }: AvatarProps) {
    return <AstryxAvatar {...props} shape={shape} src={src ?? undefined} />;
}
