import type { StoneIconName } from './Icon';
import type * as DropdownMenus from '@astryxdesign/core/DropdownMenu';
import { DropdownMenu as AstryxDropdownMenu } from '@astryxdesign/core/DropdownMenu';

export type DropdownMenuItemData = Omit<DropdownMenus.DropdownMenuItemData, 'icon' | 'items'> & {
    icon?: StoneIconName;
    items?: DropdownMenuOption[];
};
export type DropdownMenuOption =
    | DropdownMenuItemData
    | { type: 'divider' }
    | { type: 'section'; id?: string; title?: string; items: DropdownMenuItemData[] };

/** Opens an action menu using standard adaptive presentation and placement. */
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
        <AstryxDropdownMenu
            {...props}
            button={props.button ?? { label: 'Menu', variant: 'secondary', size: 'md', isDisabled: false }}
        />
    );
}
