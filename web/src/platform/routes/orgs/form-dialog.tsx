import type { ReactNode } from 'react';
import { ViewDialog } from '@/components/custom/view-dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';

/** Frames single-step organization forms in a centered, scrolling dialog column. */
export function FormDialog({ children, gap, onClose }: { children: ReactNode; gap: 6 | 8; onClose: () => void }) {
    return (
        <ViewDialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Stack padding={8} minHeight="100%" justify="center" className="shrink-0">
                <Stack gap={gap} width="100%" maxWidth={640} className="mx-auto">
                    {children}
                </Stack>
            </Stack>
        </ViewDialog>
    );
}
