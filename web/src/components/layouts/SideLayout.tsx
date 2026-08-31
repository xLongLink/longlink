import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { AppShell } from '@astryxdesign/core/AppShell';

/** Renders a side-navigation shell with LongLink's fixed content frame. */
export function SideLayout({ children, sideNav }: { children: ReactNode; sideNav: ReactNode }) {
    return (
        <AppShell height="auto" mobileNav={{ breakpoint: 'lg' }} sideNav={sideNav} variant="wash">
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-0 inset-x-0 bottom-0 top-12 overflow-clip lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-30 inset-x-0 bottom-0 top-12 border-8 border-body lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            />
            <Stack className="relative z-10" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}
