import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { AppShell } from '@astryxdesign/core/AppShell';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

type TopLayoutProps = {
    children: ReactNode;
    topMenu: ReactNode;
};

/** Renders the shared application frame with a top menu and content region. */
export default function TopLayout({ children, topMenu }: TopLayoutProps) {
    return (
        <AppShell
            banner={import.meta.env.MODE === 'sdk' ? undefined : <DevelopmentNotice />}
            className="platform-top-layout"
            contentPadding={0}
            height="auto"
            mobileNav={false}
            topNav={topMenu}
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
