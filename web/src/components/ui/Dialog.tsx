import { type ComponentProps } from 'react';
import { Dialog as AstryxDialog, DialogHeader as AstryxDialogHeader } from '@astryxdesign/core/Dialog';

type DialogHeaderProps = Omit<ComponentProps<typeof AstryxDialogHeader>, 'hasDivider'>;

/** Renders the shared application dialog surface. */
export function Dialog(props: ComponentProps<typeof AstryxDialog>) {
    return <AstryxDialog {...props} />;
}

/** Renders an application dialog header with a consistent content separator. */
export function DialogHeader(props: DialogHeaderProps) {
    return <AstryxDialogHeader {...props} hasDivider />;
}
