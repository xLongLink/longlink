import type { Spacing } from './types';
import type { ReactNode } from 'react';
import { DialogClose } from './DialogClose';
import { Stack } from '@astryxdesign/core/Stack';
import { createContext, use, useEffect } from 'react';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { Dialog as AstryxDialog } from '@astryxdesign/core/Dialog';

export const DialogActivityContext = createContext<((open: boolean) => void) | null>(null);

/** Displays an accessible modal that closes with Escape or its close button, not backdrop clicks. */
export function Dialog(props: {
    children?: ReactNode;
    /** Shows a dialog header when a title is provided. */
    title?: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** Spacing between the title and content; defaults to 3. */
    gap?: Spacing;
}) {
    const activity = use(DialogActivityContext);

    // Let an isolated runtime extend the backdrop without moving the native dialog out of its document.
    useEffect(() => {
        if (!props.isOpen || !activity) return;
        activity(true);

        return () => activity(false);
    }, [props.isOpen, activity]);

    // Keep the header fixed while bounding the content to the available viewport height.
    return (
        <AstryxDialog
            isOpen={props.isOpen}
            onOpenChange={props.onOpenChange}
            purpose="form"
            width={960}
            maxHeight="calc(100dvh - var(--spacing-10) * 4)"
            padding={0}
        >
            <DialogClose onClose={() => props.onOpenChange(false)} />
            <Stack
                gap={0}
                height="min(560px, calc(100dvh - var(--spacing-10) * 4))"
                minHeight={0}
                className="overflow-hidden"
            >
                {props.title && <DialogHeader title={props.title} className="p-4 pe-12" />}
                <Stack
                    minHeight={0}
                    paddingInline={4}
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
