import type { ReactNode } from 'react';
import { MoreMenu as AstryxMoreMenu } from '@astryxdesign/core/MoreMenu';
import type { DropdownMenuOption } from '@astryxdesign/core/DropdownMenu';

/** Opens additional actions without exposing popup geometry or presentation modes. */
export function MoreMenu(props: {
    items: DropdownMenuOption[];
    label?: string;
    icon?: ReactNode;
    isDisabled?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    return <AstryxMoreMenu {...props} />;
}
