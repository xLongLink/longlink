import type { ComponentProps } from 'react';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import { stoneIconComponents } from '@/icons';

type IconProps = {
    icon: string;
    size: ComponentProps<typeof AstryxIcon>['size'];
};

/** Renders a registered Lucide icon at the requested Astryx size. */
export function Icon({ icon, size }: IconProps) {
    const iconEntry = Object.entries(stoneIconComponents).find(([name]) => name === icon);

    if (!iconEntry) {
        return null;
    }

    const [, IconComponent] = iconEntry;

    return <AstryxIcon icon={IconComponent} size={size} />;
}
