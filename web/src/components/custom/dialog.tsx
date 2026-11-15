import type { ComponentProps } from 'react';
import { FramedDialog } from './framed-dialog';

export type DialogProps = Omit<ComponentProps<typeof FramedDialog>, 'children' | 'open' | 'onOpenChange'> & {
    open?: boolean;
    onClose: () => void;
};

/** Shares frame options and dismissal handling across application dialogs. */
export function Dialog({
    open = true,
    onClose,
    ...props
}: DialogProps & Pick<ComponentProps<typeof FramedDialog>, 'children'>) {
    return (
        <FramedDialog
            {...props}
            open={open}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        />
    );
}
