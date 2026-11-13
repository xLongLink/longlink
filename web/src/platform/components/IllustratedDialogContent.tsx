import type { ReactNode } from 'react';
import { NativeStack as Stack } from '@/components/ui/NativeStack';

export function IllustratedDialogContent({ illustration, children }: { illustration: ReactNode; children: ReactNode }) {
    // Bound the split frame to the viewport while keeping content scrolling inside the layout.
    return (
        <div className="flex h-[min(560px,calc(100dvh-var(--spacing-10)*4))] min-h-0 min-w-0 overflow-hidden">
            <div className="box-border h-full min-h-0 min-w-0 flex-1 overflow-auto p-8">{children}</div>
            <div className="hidden min-w-0 flex-[0_0_50%] overflow-hidden bg-muted md:flex">
                <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                    {illustration}
                </Stack>
            </div>
        </div>
    );
}
