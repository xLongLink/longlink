import { cn } from 'cn';
import { use, useEffect, useState } from 'react';
import * as dialog from '@/components/shadcn/dialog';
import { DialogActivityContext } from '@/components/custom/contexts';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

/** Owns modal layout and dismissal while retaining native focus and isolated-host coordination. */
export function Dialog({
    open,
    defaultOpen,
    onOpenChange,
    title,
    description,
    trigger,
    footer,
    children,
    fullscreen = false,
    dismissible = true
}: Pick<ComponentProps<typeof dialog.Dialog>, 'open' | 'defaultOpen' | 'onOpenChange'> & {
    title: string;
    description?: string;
    trigger?: ReactElement;
    footer?: ReactNode;
    children?: ReactNode;
    fullscreen?: boolean;
    dismissible?: boolean;
}) {
    const activity = use(DialogActivityContext);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(defaultOpen));
    const visible = open ?? uncontrolledOpen;
    const hasBody = children != null && children !== false;

    // Keep host coordination tied to accepted visibility changes and the modal's lifetime.
    useEffect(() => {
        if (!visible || !activity) return;
        activity(true, fullscreen);

        return () => activity(false, fullscreen);
    }, [visible, activity, fullscreen]);

    return (
        <dialog.Dialog
            open={open}
            defaultOpen={defaultOpen}
            disablePointerDismissal={!dismissible}
            onOpenChange={(nextOpen, details) => {
                if (!nextOpen && !dismissible) {
                    details.cancel();
                    return;
                }

                onOpenChange?.(nextOpen, details);
                if (!details.isCanceled) setUncontrolledOpen(nextOpen);
            }}
        >
            {trigger && <dialog.DialogTrigger render={trigger} />}
            <dialog.DialogContent
                data-fullscreen={fullscreen || undefined}
                showCloseButton={dismissible}
                className="flex min-h-0 max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden! p-0"
                style={{
                    width: fullscreen ? '95dvw' : 960,
                    maxWidth: 'calc(100dvw - var(--spacing) * 8)',
                    height: fullscreen
                        ? '95dvh'
                        : 'min(560px, calc(var(--view-viewport-height, 100dvh) - var(--spacing) * 40))'
                }}
            >
                <dialog.DialogHeader className={cn('shrink-0 p-4', hasBody && 'pb-0', dismissible && 'pr-12')}>
                    <dialog.DialogTitle>{title}</dialog.DialogTitle>
                    {description && <dialog.DialogDescription>{description}</dialog.DialogDescription>}
                </dialog.DialogHeader>
                {hasBody && (
                    <div data-slot="dialog-body" className="min-h-0 flex-1 overflow-auto p-4">
                        {children}
                    </div>
                )}
                {footer != null && footer !== false && (
                    <dialog.DialogFooter className="m-0 mt-auto shrink-0">{footer}</dialog.DialogFooter>
                )}
            </dialog.DialogContent>
        </dialog.Dialog>
    );
}
