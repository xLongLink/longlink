import { Icon } from './icon';
import { Heading } from './heading';
import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { Button } from '@/components/shadcn/button';
import { use, useEffect, useRef, useState } from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { ButtonGroupContext, ControlSizeContext, DialogActivityContext } from './contexts';
import { Dialog as NativeDialog, DialogContent, DialogTitle } from '@/components/shadcn/dialog';

type FramedDialogProps = {
    children?: ReactNode;
    /** Shows a dialog header when a title is provided. */
    title?: string;
    /** Fullscreen fills about 95% of the screen, including over Platform navigation. */
    variant?: 'standard' | 'fullscreen';
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** Spacing between the title and content; defaults to 3. */
    gap?: Spacing;
    paddingInline?: Spacing;
};

/** Composes a native dialog or a controlled frame with isolated View host coordination. */
export function Dialog(props: FramedDialogProps): ReactNode;
export function Dialog(props: BaseDialog.Root.Props & { isOpen?: never }): ReactNode;
export function Dialog(props: FramedDialogProps | (BaseDialog.Root.Props & { isOpen?: never })) {
    const activity = use(DialogActivityContext);
    const framed = props.isOpen !== undefined;
    const fullscreen = framed && props.variant === 'fullscreen';
    const [uncontrolledOpen, setUncontrolledOpen] = useState(!framed && Boolean(props.defaultOpen));
    const open = framed ? props.isOpen : (props.open ?? uncontrolledOpen);
    const title = useRef<HTMLDivElement>(null);
    const popup = useRef<HTMLDivElement>(null);

    // Let an isolated runtime extend the backdrop without moving the native dialog out of its document.
    useEffect(() => {
        if (!open || !activity) return;
        activity(true, fullscreen);

        return () => activity(false, fullscreen);
    }, [open, activity, fullscreen]);

    // Preserve native composition and track uncontrolled visibility for the isolated host.
    if (!framed) {
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

    // Keep the header fixed while bounding the content to the available viewport height.
    return (
        <BaseDialog.Root open={props.isOpen} onOpenChange={(open) => props.onOpenChange(open)} disablePointerDismissal>
            <DialogContent
                ref={popup}
                className="flex min-h-0 flex-col gap-0 overflow-hidden overscroll-contain p-0 text-start forced-colors:border forced-colors:border-[CanvasText]"
                showCloseButton={false}
                style={{
                    top: fullscreen
                        ? '50dvh'
                        : 'calc(var(--view-viewport-top, 0px) + var(--view-viewport-height, 100dvh) / 2)',
                    width: fullscreen ? '95dvw' : 960,
                    maxWidth: 'calc(100dvw - var(--spacing-4) * 2)',
                    height: fullscreen
                        ? '95dvh'
                        : 'min(560px, calc(var(--view-viewport-height, 100dvh) - var(--spacing-10) * 4))'
                }}
                data-fullscreen={fullscreen || undefined}
                aria-label={props.title ? undefined : 'Dialog'}
                onClick={(event) => event.stopPropagation()}
                initialFocus={() =>
                    popup.current?.querySelector<HTMLElement>('[data-autofocus]') ?? title.current ?? true
                }
            >
                <ButtonGroupContext value={null}>
                    <ControlSizeContext value={null}>
                        <div className="absolute end-3 top-3 z-1">
                            <BaseDialog.Close
                                aria-label="Close dialog"
                                render={<Button variant="ghost" size="icon" type="button" />}
                            >
                                <Icon icon="close" size="md" />
                            </BaseDialog.Close>
                        </div>
                        {props.title && (
                            <DialogTitle
                                ref={title}
                                render={<div />}
                                tabIndex={-1}
                                className="shrink-0 p-4 pe-12 outline-none"
                            >
                                <Heading level={2}>{props.title}</Heading>
                            </DialogTitle>
                        )}
                        <div
                            className="min-h-0 flex-1 overflow-auto"
                            style={{
                                paddingInline: `calc(var(--spacing-1) * ${props.paddingInline ?? 4})`,
                                paddingBlockStart: props.title ? `calc(var(--spacing-1) * ${props.gap ?? 3})` : 0
                            }}
                        >
                            {props.children}
                        </div>
                    </ControlSizeContext>
                </ButtonGroupContext>
            </DialogContent>
        </BaseDialog.Root>
    );
}
