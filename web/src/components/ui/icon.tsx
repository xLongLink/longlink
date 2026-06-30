import type { LucideIcon } from 'lucide-react';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';

import { cn } from '@/lib/utils';

type IconProps = {
    className?: string;
    name: string;
};

/** Normalizes XML and app icon names into Lucide's kebab-case format. */
export function normalizeIconName(name: string): string {
    return name
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .toLowerCase()
        .replace(/^-+|-+$/g, '');
}

/** Returns a Lucide icon component for a normalized icon name. */
export function createLucideIconComponent(name: string): LucideIcon | null {
    const normalizedName = normalizeIconName(name);

    if (!normalizedName) {
        return null;
    }

    return function IconComponent({ className }: { className?: string }) {
        return <DynamicIcon name={normalizedName as IconName} aria-hidden={true} className={className} />;
    } as LucideIcon;
}

/** Renders a Lucide icon by name. */
export function Icon({ className, name }: IconProps) {
    const normalizedName = normalizeIconName(name);

    if (!normalizedName) {
        throw new Error(`Unknown icon "${name}"`);
    }

    return (
        <DynamicIcon
            name={normalizedName as IconName}
            aria-hidden={true}
            className={cn('size-4 shrink-0', className)}
        />
    );
}
