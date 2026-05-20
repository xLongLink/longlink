import * as LucideIcons from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type LucideIconComponent = React.ComponentType<{
    'aria-hidden'?: boolean;
    className?: string;
}>;

type IconProps = {
    className?: string;
    name: string;
};

/** Renders a Lucide icon by name. */
export function Icon({ className, name }: IconProps) {
    const normalizedName = name
        .trim()
        .replace(/(?:^|[-_\s]+)([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');

    const IconComponent = (LucideIcons[name as keyof typeof LucideIcons] ??
        LucideIcons[normalizedName as keyof typeof LucideIcons]) as LucideIconComponent | null;

    if (!IconComponent) {
        throw new Error(`Unknown icon "${name}"`);
    }

    return <IconComponent aria-hidden={true} className={cn('size-4 shrink-0', className)} />;
}
