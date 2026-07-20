import type { ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

/** Renders the shared top layout shell. */
function TopLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
    return (
        <AppShell
            banner={import.meta.env.MODE === 'sdk' ? undefined : <DevelopmentNotice />}
            contentPadding={6}
            height="auto"
            mobileNav={false}
            topNav={header}
            variant="elevated"
        >
            {children}
        </AppShell>
    );
}

export default TopLayout;
