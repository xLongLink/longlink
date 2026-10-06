import type { ReactNode } from 'react';
import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';

/** Displays a count or enumerated state. */
export function Badge(props: {
    label?: ReactNode;
    icon?: ReactNode;
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
    return <AstryxBadge {...props} label={props.label} variant={props.variant ?? 'neutral'} />;
}
