import type { ReactNode } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Layout, LayoutPanel, LayoutContent } from '@astryxdesign/core/Layout';

export function IllustratedDialogContent({ illustration, children }: { illustration: ReactNode; children: ReactNode }) {
    // Bound the split frame to the viewport while keeping content scrolling inside the layout.
    return (
        <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
            <Layout
                padding={0}
                end={
                    <LayoutPanel width="50%" padding={0} className="hidden bg-muted md:flex">
                        <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                            {illustration}
                        </Stack>
                    </LayoutPanel>
                }
                content={<LayoutContent padding={8}>{children}</LayoutContent>}
            />
        </Stack>
    );
}
