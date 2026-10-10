import { Icon, type StoneIconName } from './Icon';
import type * as DropdownMenus from '@astryxdesign/core/DropdownMenu';

export type DropdownMenuItemData = Omit<DropdownMenus.DropdownMenuItemData, 'icon' | 'items'> & {
    icon?: StoneIconName;
    items?: DropdownMenuOption[];
};

export type DropdownMenuOption =
    | DropdownMenuItemData
    | { type: 'divider' }
    | { type: 'section'; id?: string; title?: string; items: DropdownMenuItemData[] };

/** Adapts LongLink icon names in action rows, sections, and nested submenus to renderable glyphs. */
export function icons(items: DropdownMenuOption[]): DropdownMenus.DropdownMenuOption[] {
    // Preserve grouping while resolving every action through the same icon boundary.
    return items.map((item) => {
        if ('type' in item) {
            if (item.type === 'divider') return item;

            return { ...item, items: item.items.map(actionIcon) };
        }

        return actionIcon(item);
    });
}

/** Gives section actions, submenu triggers, and leaf actions identical glyph sizing and loading. */
function actionIcon(item: DropdownMenuItemData): DropdownMenus.DropdownMenuItemData {
    // Preserve interaction data and recursively adapt any nested submenu.
    return {
        ...item,
        icon: item.icon ? <Icon icon={item.icon} size="sm" /> : undefined,
        items: item.items ? icons(item.items) : undefined,
    };
}
