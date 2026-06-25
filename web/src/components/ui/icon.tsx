import * as React from 'react';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';

import { cn } from '@/lib/utils';

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

    if (!normalizedName) {
        throw new Error(`Unknown icon "${name}"`);
    }

    return <DynamicIcon name={normalizedName as IconName} aria-hidden={true} className={cn('size-4 shrink-0', className)} />;
}
