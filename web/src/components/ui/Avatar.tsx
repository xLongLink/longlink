import type { ComponentProps } from 'react';
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';

type AstryxAvatarProps = Omit<ComponentProps<typeof AstryxAvatar>, 'shape' | 'src'>;

interface AvatarProps extends AstryxAvatarProps {
    kind?: 'organization' | 'user';
    name?: string;
    src?: string | null;
}

/** Renders a circular user avatar or rounded-square organization avatar. */
export function Avatar({ kind, src, ...props }: AvatarProps) {
    return <AstryxAvatar {...props} shape={kind === 'organization' ? 'rounded' : 'circle'} src={src ?? undefined} />;
}
