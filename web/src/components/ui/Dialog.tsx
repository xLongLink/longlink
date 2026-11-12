import { X } from 'lucide-react';
import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { use, useEffect } from 'react';
import { Stack } from '@/components/astryx/Stack';
import { DialogActivityContext } from './contexts';
import { DialogHeader } from '@/components/astryx/Dialog';
import { IconButton } from '@/components/astryx/IconButton';
import { Dialog as AstryxDialog } from '@/components/astryx/Dialog';

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
    const maxHeight = fullscreen ? '95dvh' : 'calc(var(--view-viewport-height, 100dvh) - var(--spacing-10) * 4)';

    // Let an isolated runtime extend the backdrop without moving the native dialog out of its document.
    useEffect(() => {
        if (!props.isOpen || !activity) return;
        activity(true, fullscreen);

        return () => activity(false, fullscreen);
    }, [props.isOpen, activity, fullscreen]);

    // Keep the header fixed while bounding the content to the available viewport height.
    return (
        <AstryxDialog
            isOpen={props.isOpen}
            onOpenChange={props.onOpenChange}
            purpose="form"
            width={fullscreen ? '95dvw' : 960}
            className={fullscreen ? undefined : 'top-(--view-viewport-top) bottom-(--view-viewport-bottom)'}
            maxHeight={maxHeight}
            padding={0}
        >
            <IconButton
                label="Close dialog"
                tooltip="Close"
                icon={<X className="size-5" aria-hidden="true" />}
                variant="ghost"
                className="absolute top-3 end-3 z-10"
                onClick={() => props.onOpenChange(false)}
            />
            <Stack
                gap={0}
                height={fullscreen ? maxHeight : `min(560px, ${maxHeight})`}
                minHeight={0}
                className="overflow-hidden"
            >
                {props.title && <DialogHeader title={props.title} className="p-4 pe-12" />}
                <Stack
                    minHeight={0}
                    paddingInline={props.paddingInline ?? 4}
                    paddingBlockStart={props.title ? (props.gap ?? 3) : 0}
                    isScrollable
                    className="flex-1"
                >
                    {props.children}
                </Stack>
            </Stack>
        </AstryxDialog>
    );
}
