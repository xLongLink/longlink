import { Icon } from './Icon';
import { Heading } from './Heading';
import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { use, useEffect, useRef } from 'react';
import { Button } from '@/components/shadcn/button';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { DialogContent, DialogTitle } from '@/components/shadcn/dialog';
import { ButtonGroupContext, ControlSizeContext, DialogActivityContext } from './contexts';

/** Custom modal frame coordinating fullscreen state with the isolated View host. */
export function ViewDialog(props: {
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
}) {
    const activity = use(DialogActivityContext);
    const fullscreen = props.variant === 'fullscreen';
    const title = useRef<HTMLDivElement>(null);
    const popup = useRef<HTMLDivElement>(null);

    // Let an isolated runtime extend the backdrop without moving the native dialog out of its document.
    useEffect(() => {
        if (!props.isOpen || !activity) return;
        activity(true, fullscreen);

        return () => activity(false, fullscreen);
    }, [props.isOpen, activity, fullscreen]);

    // Keep the header fixed while bounding the content to the available viewport height.
    return (
        <BaseDialog.Root open={props.isOpen} onOpenChange={(open) => props.onOpenChange(open)} disablePointerDismissal>
            <DialogContent
                ref={popup}
                className="view-dialog flex min-h-0 flex-col gap-0 overflow-hidden p-0"
                showCloseButton={false}
                style={{
                    top: fullscreen
                        ? '50dvh'
                        : 'calc(var(--view-viewport-top, 0px) + var(--view-viewport-height, 100dvh) / 2)',
                    width: fullscreen ? '95dvw' : 960,
                    maxWidth: 'calc(100dvw - var(--spacing-4) * 2)',
                    height: fullscreen
                        ? '95dvh'
                        : 'min(560px, calc(var(--view-viewport-height, 100dvh) - var(--spacing-10) * 4))',
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
                        <div className="view-dialog-close">
                            <BaseDialog.Close
                                aria-label="Close dialog"
                                render={<Button variant="ghost" size="icon" type="button" />}
                            >
                                <Icon icon="close" size="md" />
                            </BaseDialog.Close>
                        </div>
                        {props.title && (
                            <DialogTitle ref={title} render={<div />} tabIndex={-1} className="view-dialog-title">
                                <Heading level={2}>{props.title}</Heading>
                            </DialogTitle>
                        )}
                        <div
                            className="view-dialog-content"
                            style={{
                                paddingInline: `calc(var(--spacing-1) * ${props.paddingInline ?? 4})`,
                                paddingBlockStart: props.title ? `calc(var(--spacing-1) * ${props.gap ?? 3})` : 0,
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
