import { AppShell } from '@astryxdesign/core/AppShell';
import { Stack } from '@astryxdesign/core/Stack';
import type { ReactNode } from 'react';
import { ContentFrame } from '@/layout/ContentFrame';

/** Renders the shared application shell with side navigation. */
export default function SideLayout({ children, sideNav }: { children: ReactNode; sideNav: ReactNode }) {
    return (
        <AppShell contentPadding={0} height="auto" mobileNav={{ breakpoint: 'lg' }} sideNav={sideNav} variant="wash">
            <ContentFrame className="end-0 bottom-0 start-0 top-12 lg:start-[260px] lg:top-0" />
            <Stack className="relative z-10" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}
