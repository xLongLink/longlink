import { DropdownMenu as AstryxDropdownMenu, type DropdownMenuOption } from '@astryxdesign/core/DropdownMenu';

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
    return <AstryxDropdownMenu {...props} />;
}
