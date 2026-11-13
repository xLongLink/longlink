import { MenuControl } from '@/components/ui/menus';
import type { ActionMenuOption } from '@/components/ui/menus';

export type { ActionMenuItemData, ActionMenuOption } from '@/components/ui/menus';

/** Opens an action menu using standard anchored presentation and placement. */
export function ActionMenu(props: {
    button?: {
        label: string;
        variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
        size?: 'sm' | 'md' | 'lg';
        isDisabled?: boolean;
    };
    items: ActionMenuOption[];
    isMenuOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    // Supply an accessible trigger while preserving uncontrolled menu state.
    return (
        <MenuControl
            items={props.items}
            isMenuOpen={props.isMenuOpen}
            onOpenChange={props.onOpenChange}
            label={props.button?.label ?? 'Menu'}
            variant={props.button?.variant}
            size={props.button ? props.button.size : 'md'}
            isDisabled={props.button?.isDisabled}
        />
    );
}
