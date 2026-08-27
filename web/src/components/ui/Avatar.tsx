import type { ComponentProps } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';

type UserAvatarProps = ComponentProps<typeof AstryxAvatar> & { kind?: 'user' };

type OrganizationAvatarProps = {
    kind: 'organization';
    name: string;
    size?: 'md' | 'lg';
    src?: string | null;
};

export type AvatarProps = OrganizationAvatarProps | UserAvatarProps;

/** Renders a circular user avatar or a squircle organization avatar. */
export function Avatar(props: AvatarProps) {
    if (props.kind !== 'organization') {
        const { kind: _, ...avatarProps } = props;

        return <AstryxAvatar {...avatarProps} />;
    }

    const className = props.size === 'lg' ? 'size-12 shrink-0 object-cover' : 'size-9 shrink-0 object-cover';
    const style = { borderRadius: 'var(--radius-container)' };

    if (!props.src) {
        return (
            <Text
                aria-label={props.name}
                className={className}
                role="img"
                style={{
                    ...style,
                    alignItems: 'center',
                    backgroundColor: 'var(--color-neutral)',
                    color: 'var(--color-text-secondary)',
                    display: 'inline-flex',
                    fontWeight: 'var(--font-weight-medium)',
                    justifyContent: 'center',
                }}
            >
                {props.name.slice(0, 1).toUpperCase()}
            </Text>
        );
    }

    return <img alt={props.name} className={className} src={props.src} style={style} />;
}
