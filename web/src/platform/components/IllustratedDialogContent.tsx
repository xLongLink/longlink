import type { ReactNode } from 'react';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import './dialogcontent.css';

export function IllustratedDialogContent({ illustration, children }: { illustration: ReactNode; children: ReactNode }) {
    // Bound the split frame to the viewport while keeping content scrolling inside the layout.
    return (
        <div className="platform-dialog-frame platform-dialog-split">
            <div className="platform-dialog-scroll">{children}</div>
            <div className="platform-dialog-illustration bg-muted">
                <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                    {illustration}
                </Stack>
            </div>
        </div>
    );
}
