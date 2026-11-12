import * as menus from './menus';
import { Icon, type StoneIconName } from './Icon';
import type { DropdownMenuOption } from './menus';
import { MoreMenu as AstryxMoreMenu } from '@/components/astryx/MoreMenu';

/** Opens additional actions without exposing popup geometry or presentation modes. */
export function MoreMenu(props: {
    items: DropdownMenuOption[];
    label?: string;
    icon?: StoneIconName;
    isDisabled?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    // Keep the overflow trigger accessible and enabled without caller configuration.
    return (
        <AstryxMoreMenu
            {...props}
            items={menus.icons(props.items)}
            icon={props.icon ? <Icon icon={props.icon} size="md" /> : undefined}
            label={props.label ?? 'More options'}
            isDisabled={props.isDisabled ?? false}
        />
    );
}
