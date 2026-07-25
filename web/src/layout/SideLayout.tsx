import type { ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';

/** Renders the shared application shell with side navigation. */
export default function SideLayout({ children, sideNav }: { children: ReactNode; sideNav: ReactNode }) {
    return (
        <AppShell contentPadding={0} height="auto" mobileNav={{ breakpoint: 'lg' }} sideNav={sideNav} variant="wash">
            {children}
        </AppShell>
    );
}
