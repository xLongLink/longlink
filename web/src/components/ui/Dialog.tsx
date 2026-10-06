import type { ReactNode } from 'react';
import { Dialog as AstryxDialog } from '@astryxdesign/core/Dialog';

/** Displays an accessible modal with an explicit purpose and controlled visibility. */
export function Dialog(props: {
    children?: ReactNode;
    'aria-label': string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    purpose?: 'form' | 'info' | 'required';
}) {
    // Informational dialogs allow ordinary dismissal unless another purpose is supplied.
    return <AstryxDialog {...props} children={props.children} purpose={props.purpose ?? 'info'} />;
}
