import type { ComponentProps, ReactNode } from 'react';
import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';

type BadgeProps = Omit<ComponentProps<typeof AstryxBadge>, 'children' | 'label'> & { children?: ReactNode };

/** Renders a badge whose label content is supplied as children. */
export function Badge({ children, ...props }: BadgeProps) {
    return <AstryxBadge {...props} label={children} />;
}
