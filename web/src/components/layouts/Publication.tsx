import { Outlet } from 'react-router';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Stack } from '@/components/astryx/Stack';
import { AppShell } from '@/components/astryx/AppShell';

/** Shares public publication chrome without owning its navigation or sidebar policy. */
export default function Publication({
    navigation,
    sideNav,
    className = 'min-h-0!',
}: {
    navigation?: ReactNode;
    sideNav: ReactNode;
    className?: string;
}) {
    return (
        <Stack minHeight="100dvh">
            <Navbar maxWidth={1272} navigation={navigation} />
            <Stack className="mx-auto flex-1" maxWidth={1320} width="100%">
                <AppShell
                    className={className}
                    height="auto"
                    mobileNav={{ breakpoint: 'lg' }}
                    variant="wash"
                    sideNav={sideNav}
                >
                    <Outlet />
                </AppShell>
            </Stack>
            <Footer maxWidth={1272} />
        </Stack>
    );
}
