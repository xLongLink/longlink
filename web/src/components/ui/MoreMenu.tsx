import { useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Icon, type StoneIconName } from './Icon';
import type { DropdownMenuOption } from './DropdownMenu';
import { MoreMenu as AstryxMoreMenu } from '@astryxdesign/core/MoreMenu';

/** Opens additional actions without exposing popup geometry or presentation modes. */
export function MoreMenu(props: {
    /** Hides the trigger and closes its popup without unmounting the component. */
    hidden?: boolean;
    items: DropdownMenuOption[];
    label?: string;
    icon?: StoneIconName;
    isDisabled?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}) {
    // Control popup visibility so hiding the trigger cannot leave an open menu behind.
    const [open, setOpen] = useState(false);

    // Keep the overflow trigger accessible and enabled without caller configuration.
    return (
        <Stack as="span" hidden={props.hidden} className={props.hidden ? 'hidden!' : 'contents!'}>
            <AstryxMoreMenu
                {...props}
                className={props.hidden ? 'hidden!' : undefined}
                isMenuOpen={open && !props.hidden}
                onOpenChange={(isOpen) => {
                    setOpen(isOpen);
                    props.onOpenChange?.(isOpen);
                }}
                icon={props.icon ? <Icon icon={props.icon} size="md" /> : undefined}
                label={props.label ?? 'More options'}
                isDisabled={props.isDisabled ?? false}
            />
        </Stack>
    );
}
