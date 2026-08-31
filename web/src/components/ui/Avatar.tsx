import type { ComponentProps } from 'react';
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';

type AstryxAvatarProps = Omit<ComponentProps<typeof AstryxAvatar>, 'src'>;

type AvatarProps = AstryxAvatarProps &
    ({ kind: 'organization'; name: string; src?: string | null } | { kind?: 'user'; src?: string });

/** Renders a circular user avatar or rounded-square organization avatar. */
export function Avatar({ kind, shape, src, ...props }: AvatarProps) {
    return (
        <AstryxAvatar
            {...props}
            shape={shape ?? (kind === 'organization' ? 'rounded' : 'circle')}
            src={src ?? undefined}
        />
    );
}
