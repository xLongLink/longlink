import { MenuControl } from './menus';
import type { StoneIconName } from './Icon';
import type { ActionMenuOption } from './menus';

/** Opens additional actions without exposing popup geometry or presentation modes. */
export function MoreMenu(props: {
    items: ActionMenuOption[];
    label?: string;
    icon?: StoneIconName;
    isDisabled?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    // Keep the overflow trigger accessible and enabled without caller configuration.
    return (
        <MenuControl
            items={props.items}
            icon={props.icon}
            label={props.label ?? 'More options'}
            isDisabled={props.isDisabled ?? false}
            onOpenChange={props.onOpenChange}
            variant="ghost"
            iconOnly
        />
    );
}
