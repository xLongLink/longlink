import { use, useEffect, useState } from 'react';
import { DialogActivityContext } from './contexts';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Dialog as NativeDialog } from '@/components/shadcn/dialog';

/** Coordinates native dialog visibility with the isolated View host. */
export function Dialog({
    fullscreen = false,
    ...props
}: BaseDialog.Root.Props & {
    /** Expands the isolated View host over Platform navigation; does not style the dialog content. */
    fullscreen?: boolean;
}) {
    const activity = use(DialogActivityContext);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(props.defaultOpen));
    const open = props.open ?? uncontrolledOpen;

    // Let an isolated runtime extend the backdrop without moving the native dialog out of its document.
    useEffect(() => {
        if (!open || !activity) return;
        activity(true, fullscreen);

        return () => activity(false, fullscreen);
    }, [open, activity, fullscreen]);

    // Preserve native composition and track uncontrolled visibility for the isolated host.
    return (
        <NativeDialog
            {...props}
            onOpenChange={(open, details) => {
                props.onOpenChange?.(open, details);

                if (!details.isCanceled) setUncontrolledOpen(open);
            }}
        />
    );
}
