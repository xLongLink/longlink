import type { ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

/** Renders the shared top layout shell. */
function TopLayout({
    header,
    children,
    fullHeight = false,
    height = 'auto',
}: {
    header: ReactNode;
    children: ReactNode;
    fullHeight?: boolean;
    height?: 'auto' | 'fill';
}) {
    return (
        <AppShell
            banner={import.meta.env.MODE === 'sdk' ? undefined : <DevelopmentNotice />}
            contentPadding={6}
            height={height}
            mobileNav={false}
            topNav={header}
            variant="elevated"
        >
            {fullHeight && height === 'auto' ? (
                <div
                    style={{
                        minHeight: 'calc(100dvh - var(--appshell-header-height, 0px) - var(--spacing-12))',
                    }}
                >
                    {children}
                </div>
            ) : (
                children
            )}
        </AppShell>
    );
}

export default TopLayout;
