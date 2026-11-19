import type { ComponentType } from 'react';
import * as menu from '@/components/shadcn/dropdown-menu';

export {
    DropdownMenu as Dropdown,
    DropdownMenuPortal as DropdownPortal,
    DropdownMenuSub as DropdownSub
} from '@/components/shadcn/dropdown-menu';

function fixedStyles<Props extends object>(Component: ComponentType<Props>) {
    return function DropdownPart(props: Props) {
        return <Component {...props} className={undefined} style={undefined} />;
    };
}

export const DropdownTrigger = fixedStyles(menu.DropdownMenuTrigger);
export const DropdownContent = fixedStyles(menu.DropdownMenuContent);
export const DropdownGroup = fixedStyles(menu.DropdownMenuGroup);
export const DropdownLabel = fixedStyles(menu.DropdownMenuLabel);
export const DropdownItem = fixedStyles(menu.DropdownMenuItem);
export const DropdownCheckboxItem = fixedStyles(menu.DropdownMenuCheckboxItem);
export const DropdownRadioGroup = fixedStyles(menu.DropdownMenuRadioGroup);
export const DropdownRadioItem = fixedStyles(menu.DropdownMenuRadioItem);
export const DropdownSeparator = fixedStyles(menu.DropdownMenuSeparator);
export const DropdownShortcut = fixedStyles(menu.DropdownMenuShortcut);
export const DropdownSubTrigger = fixedStyles(menu.DropdownMenuSubTrigger);
export const DropdownSubContent = fixedStyles(menu.DropdownMenuSubContent);
