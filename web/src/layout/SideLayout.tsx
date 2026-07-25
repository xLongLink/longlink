import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { AppShell } from '@astryxdesign/core/AppShell';

/** Renders the shared application shell with side navigation. */
export default function SideLayout({ children, sideNav }: { children: ReactNode; sideNav: ReactNode }) {
    return (
        <AppShell contentPadding={0} height="auto" mobileNav={{ breakpoint: 'lg' }} sideNav={sideNav} variant="wash">
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed end-0 bottom-0 start-0 top-12 z-0 overflow-clip lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Stack className="relative z-10" padding={2}>
                {children}
            </Stack>
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed end-0 bottom-0 start-0 top-12 z-30 border-8 border-body bg-transparent lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            />
        </AppShell>
    );
}
