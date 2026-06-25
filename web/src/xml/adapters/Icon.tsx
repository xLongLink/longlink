import { useXmlContext } from '@xml/core/context';
import type { Props } from '@xml/types';
import * as React from 'react';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';
import { resolveXmlString } from './props';

/** Props accepted by the XML Icon component. */

/** Resolves a Lucide icon component from an XML icon name. */
function resolveIconComponent(name: string) {
    const normalizedName = name
        .trim()
        .replace(/(?:^|[-_\s]+)([a-zA-Z0-9])/g, (_match, char: string) => char.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');

    if (!normalizedName) {
        return null;
    }

    return function IconComponent({ className }: { className?: string }) {
        return <DynamicIcon name={normalizedName as IconName} aria-hidden={true} className={className} />;
    };
}

/** Renders a Lucide icon by XML name. */
export function Icon({ props }: Props) {
    const { ctx } = useXmlContext();
    const name = resolveXmlString(props, 'name', ctx, '');
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

    return <IconComponent aria-hidden={true} className="size-4 shrink-0" />;
}
