import { use, useEffect, useState } from 'react';
import { DialogActivityContext } from './contexts';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Dialog as NativeDialog } from '@/components/shadcn/dialog';

/** Preserves native composition while coordinating isolated View host activity. */
export function Dialog(props: BaseDialog.Root.Props) {
    const activity = use(DialogActivityContext);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(props.defaultOpen));
    const open = props.open ?? uncontrolledOpen;

    // Let an isolated runtime extend the backdrop without moving the native dialog out of its document.
    useEffect(() => {
        if (!open || !activity) return;
        activity(true, false);

        return () => activity(false, false);
    }, [open, activity]);

    // Track accepted uncontrolled visibility changes without overriding native cancellation.
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
