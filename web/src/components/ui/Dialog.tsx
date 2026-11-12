import { Icon } from './Icon';
import { Heading } from './Heading';
import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { use, useEffect, useRef } from 'react';
import { Button } from '@/components/shadcn/button';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { ButtonGroupContext, ControlSizeContext, DialogActivityContext } from './contexts';

/** Displays an accessible modal that closes with Escape or its close button, not backdrop clicks. */
export function Dialog(props: {
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
            <BaseDialog.Portal className="view-dialog-layer">
                <BaseDialog.Backdrop className="view-dialog-backdrop" />
                <BaseDialog.Popup
                    ref={popup}
                    className="view-dialog"
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
                                    render={
                                        <Button
                                            variant="view"
                                            data-variant="ghost"
                                            data-size="md"
                                            data-icon-only
                                            type="button"
                                        />
                                    }
                                >
                                    <Icon icon="close" size="md" />
                                </BaseDialog.Close>
                            </div>
                            {props.title && (
                                <BaseDialog.Title
                                    ref={title}
                                    render={<div />}
                                    tabIndex={-1}
                                    className="view-dialog-title"
                                >
                                    <Heading level={2}>{props.title}</Heading>
                                </BaseDialog.Title>
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
                </BaseDialog.Popup>
            </BaseDialog.Portal>
        </BaseDialog.Root>
    );
}
