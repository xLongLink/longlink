import * as menus from './menus';
import type { DropdownMenuOption } from './menus';
import { DropdownMenu as AstryxDropdownMenu } from '@/components/astryx/DropdownMenu';

export type { DropdownMenuItemData, DropdownMenuOption } from './menus';

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
            items={menus.icons(props.items)}
            button={props.button ?? { label: 'Menu', variant: 'secondary', size: 'md', isDisabled: false }}
        />
    );
}
