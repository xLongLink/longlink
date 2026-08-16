import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { AppShell } from '@astryxdesign/core/AppShell';
import type { ReactNode } from 'react';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

type PlatformProps = {
    children: ReactNode;
    topNav: ReactNode;
};

/** Renders the shared platform shell with top navigation. */
function Platform({ children, topNav }: PlatformProps) {
    return (
        <AppShell
            banner={import.meta.env.MODE === 'sdk' ? undefined : <DevelopmentNotice />}
            className="platform-top-layout"
            contentPadding={0}
            height="auto"
            mobileNav={false}
            topNav={topNav}
            variant="wash"
        >
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-0 end-0 bottom-0 start-0 top-0 overflow-clip"
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-30 end-0 bottom-0 start-0 top-0 border-8 border-body bg-transparent"
                padding={0}
                variant="transparent"
            />
            <Stack className="relative z-10" minHeight="calc(100dvh - var(--appshell-header-height, 0px))" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}

export default Platform;
