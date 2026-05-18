import * as LucideIcons from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type LucideIconComponent = React.ComponentType<{
    'aria-hidden'?: boolean;
    className?: string;
}>;

/** Props accepted by the XML Icon component. */
export interface IconProps {
    className?: string;
    name?: string;
}

/** Resolves a Lucide icon component from an XML icon name. */
function resolveIconComponent(name: string): LucideIconComponent | null {
    const normalizedName = name
        .trim()
        .replace(/(?:^|[-_\s]+)([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');

    return (
        LucideIcons[name as keyof typeof LucideIcons] ??
        LucideIcons[normalizedName as keyof typeof LucideIcons]
    ) as LucideIconComponent | null;
}


/** Renders a Lucide icon by XML name. */
export function Icon({ className, name = '' }: IconProps) {
    const iconName = String(name ?? '');

    // Fail fast when the caller omits the required icon name.
    if (!iconName.trim()) {
        throw new Error('Icon requires a string name');
    }

    const IconComponent = resolveIconComponent(iconName);

    // Keep icon lookup predictable so XML authors get an immediate error for invalid names.
    if (!IconComponent) {
        throw new Error(`Unknown icon "${iconName}"`);
    }

    return <IconComponent aria-hidden={true} className={cn('mr-1.5 size-4 shrink-0', className)} />;
}
