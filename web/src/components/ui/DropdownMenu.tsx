import { useState } from 'react';
import { Icon, type StoneIconName } from './Icon';
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

/** Adapts LongLink icon names in action rows, sections, and nested submenus to renderable glyphs. */
function menuIcons(items: DropdownMenuOption[]): DropdownMenus.DropdownMenuOption[] {
    // Resolve every nested action through Icon while preserving its interaction and grouping data.
    return items.map((item) => {
        if ('type' in item) {
            if (item.type === 'divider') return item;

            return {
                ...item,
                items: item.items.map((entry) => ({
                    ...entry,
                    icon: entry.icon ? <Icon icon={entry.icon} size="sm" /> : undefined,
                    items: entry.items ? menuIcons(entry.items) : undefined,
                })),
            };
        }

        // Submenu triggers and leaf actions use identical glyph sizing and loading behavior.
        return {
            ...item,
            icon: item.icon ? <Icon icon={item.icon} size="sm" /> : undefined,
            items: item.items ? menuIcons(item.items) : undefined,
        };
    });
}

/** Opens an action menu using standard adaptive presentation and placement. */
export function DropdownMenu(props: {
    /** Hides the trigger and closes its popup without unmounting the component. */
    hidden?: boolean;
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
    // Own uncontrolled visibility so hiding also closes a popup outside the trigger's subtree.
    const [open, setOpen] = useState(false);

    // Supply an accessible trigger while preserving uncontrolled menu state.
    return (
        <AstryxDropdownMenu
            {...props}
            items={menuIcons(props.items)}
            className={props.hidden ? 'hidden!' : undefined}
            isMenuOpen={!props.hidden && (props.isMenuOpen ?? open)}
            onOpenChange={(isOpen) => {
                if (props.isMenuOpen === undefined) setOpen(isOpen);
                props.onOpenChange?.(isOpen);
            }}
            button={{
                ...(props.button ?? { label: 'Menu', variant: 'secondary', size: 'md', isDisabled: false }),
                hidden: props.hidden,
                className: props.hidden ? 'hidden!' : undefined,
            }}
        />
    );
}
