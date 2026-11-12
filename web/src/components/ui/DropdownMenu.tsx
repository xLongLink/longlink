import { ActionMenu } from './menus';
import type { DropdownMenuOption } from './menus';

export type { DropdownMenuItemData, DropdownMenuOption } from './menus';

/** Opens an action menu using standard anchored presentation and placement. */
export function DropdownMenu(props: {
    button?: {
        label: string;
        variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
        size?: 'sm' | 'md' | 'lg';
        isDisabled?: boolean;
    };
    items: DropdownMenuOption[];
    isMenuOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    // Supply an accessible trigger while preserving uncontrolled menu state.
    return (
        <ActionMenu
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
