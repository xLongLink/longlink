import type { ComponentProps } from 'react';
import { Icon as AstryxIcon } from '@astryxdesign/core/Icon';
import { stoneIconComponents, type StoneIconName } from '@/icons';

type IconProps = {
    icon: StoneIconName;
    size: ComponentProps<typeof AstryxIcon>['size'];
};

/** Renders a registered Lucide icon at the requested Astryx size. */
export function Icon({ icon, size }: IconProps) {
    return <AstryxIcon icon={stoneIconComponents[icon]} size={size} />;
}
