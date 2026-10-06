import type { ReactNode } from 'react';
import { Icon, type StoneIconName } from './Icon';
import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';

/** Displays a count or enumerated state. */
export function Badge(props: {
    label?: ReactNode;
    icon?: StoneIconName;
    variant?:
        | 'neutral'
        | 'info'
        | 'success'
        | 'warning'
        | 'error'
        | 'blue'
        | 'cyan'
        | 'green'
        | 'orange'
        | 'pink'
        | 'purple'
        | 'red'
        | 'teal'
        | 'yellow';
}) {
    // Use a neutral state unless the caller chooses a semantic variant.
    return (
        <AstryxBadge
            {...props}
            icon={props.icon ? <Icon icon={props.icon} size="sm" /> : undefined}
            label={props.label}
            variant={props.variant ?? 'neutral'}
        />
    );
}
