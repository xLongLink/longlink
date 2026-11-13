import { MenuControl, type NativeMenuOption } from './menus';

/** Preserves Platform row geometry and native icons without expanding the isolated View API. */
export function NativeMoreMenu({
    items,
    label = 'More options',
    size = 'md',
    alignment = 'start',
    isDisabled
}: {
    items: NativeMenuOption[];
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    alignment?: 'start' | 'center' | 'end';
    isDisabled?: boolean;
}) {
    return (
        <MenuControl
            items={items}
            label={label}
            size={size}
            alignment={alignment}
            isDisabled={isDisabled}
            variant="ghost"
            iconOnly
        />
    );
}
