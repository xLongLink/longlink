import type { ComponentProps } from 'react';
import * as menu from '@/components/shadcn/dropdown-menu';

export function Dropdown(props: ComponentProps<typeof menu.DropdownMenu>) {
    return <menu.DropdownMenu {...props} />;
}

export function DropdownPortal(props: ComponentProps<typeof menu.DropdownMenuPortal>) {
    return <menu.DropdownMenuPortal {...props} />;
}

export function DropdownTrigger(props: Omit<ComponentProps<typeof menu.DropdownMenuTrigger>, 'className'>) {
    return <menu.DropdownMenuTrigger {...props} className={undefined} />;
}

export function DropdownContent(props: Omit<ComponentProps<typeof menu.DropdownMenuContent>, 'className'>) {
    return <menu.DropdownMenuContent {...props} className={undefined} />;
}

export function DropdownGroup(props: Omit<ComponentProps<typeof menu.DropdownMenuGroup>, 'className'>) {
    return <menu.DropdownMenuGroup {...props} className={undefined} />;
}

export function DropdownLabel(props: Omit<ComponentProps<typeof menu.DropdownMenuLabel>, 'className'>) {
    return <menu.DropdownMenuLabel {...props} className={undefined} />;
}

export function DropdownItem(props: Omit<ComponentProps<typeof menu.DropdownMenuItem>, 'className'>) {
    return <menu.DropdownMenuItem {...props} className={undefined} />;
}

export function DropdownCheckboxItem(props: Omit<ComponentProps<typeof menu.DropdownMenuCheckboxItem>, 'className'>) {
    return <menu.DropdownMenuCheckboxItem {...props} className={undefined} />;
}

export function DropdownRadioGroup(props: Omit<ComponentProps<typeof menu.DropdownMenuRadioGroup>, 'className'>) {
    return <menu.DropdownMenuRadioGroup {...props} className={undefined} />;
}

export function DropdownRadioItem(props: Omit<ComponentProps<typeof menu.DropdownMenuRadioItem>, 'className'>) {
    return <menu.DropdownMenuRadioItem {...props} className={undefined} />;
}

export function DropdownSeparator(props: Omit<ComponentProps<typeof menu.DropdownMenuSeparator>, 'className'>) {
    return <menu.DropdownMenuSeparator {...props} className={undefined} />;
}

export function DropdownShortcut(props: Omit<ComponentProps<typeof menu.DropdownMenuShortcut>, 'className'>) {
    return <menu.DropdownMenuShortcut {...props} className={undefined} />;
}

export function DropdownSub(props: ComponentProps<typeof menu.DropdownMenuSub>) {
    return <menu.DropdownMenuSub {...props} />;
}

export function DropdownSubTrigger(props: Omit<ComponentProps<typeof menu.DropdownMenuSubTrigger>, 'className'>) {
    return <menu.DropdownMenuSubTrigger {...props} className={undefined} />;
}

export function DropdownSubContent(props: Omit<ComponentProps<typeof menu.DropdownMenuSubContent>, 'className'>) {
    return <menu.DropdownMenuSubContent {...props} className={undefined} />;
}
