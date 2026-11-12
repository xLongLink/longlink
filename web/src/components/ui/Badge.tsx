import type { ReactNode } from 'react';
import { Icon, type StoneIconName } from './Icon';
import { Badge as ReuiBadge } from '@/components/reui/badge';

const variants = {
    neutral: 'secondary',
    info: 'info-light',
    success: 'success-light',
    warning: 'warning-light',
    error: 'destructive-light',
} as const;

/** Displays a count or enumerated state. */
export function Badge(props: {
    label?: ReactNode;
    icon?: StoneIconName;
    variant?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
}) {
    // Use a neutral state unless the caller chooses a semantic variant.
    return (
        <ReuiBadge variant={variants[props.variant ?? 'neutral']}>
            {props.icon && <Icon icon={props.icon} size="sm" />}
            {props.label}
        </ReuiBadge>
    );
}
