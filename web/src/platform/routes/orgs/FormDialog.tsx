import type { ReactNode } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';

/** Frames single-step organization forms in a centered, scrolling dialog column. */
export function FormDialog({ children, gap, onClose }: { children: ReactNode; gap: 6 | 8; onClose: () => void }) {
    return (
        <Dialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                <Layout
                    padding={0}
                    content={
                        <LayoutContent padding={8}>
                            <Stack
                                gap={gap}
                                minHeight="100%"
                                justify="center"
                                width="100%"
                                maxWidth={640}
                                className="mx-auto"
                            >
                                {children}
                            </Stack>
                        </LayoutContent>
                    }
                />
            </Stack>
        </Dialog>
    );
}
