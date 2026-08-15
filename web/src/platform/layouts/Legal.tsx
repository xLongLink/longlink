import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Wordmark } from '@/components/Wordmark';

/** Renders legal content with the fixed legal navigation. */
export function Legal({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();

    return (
        <AppShell
            contentPadding={0}
            height="auto"
            mobileNav={{ breakpoint: 'lg' }}
            sideNav={
                <SideNav
                    header={
                        <Stack className="-my-2">
                            <Center className="lg:mt-2" height={64} width="100%">
                                <Link href="/" label="LongLink home" color="inherit">
                                    <Wordmark size="heading" />
                                </Link>
                            </Center>
                            <Stack paddingInline={2}>
                                <Divider />
                            </Stack>
                        </Stack>
                    }
                >
                    <Stack paddingInline={2}>
                        <SideNavSection title="Legal">
                            <SideNavItem href="/terms" isSelected={pathname === '/terms'} label="Terms" />
                            <SideNavItem href="/impressum" isSelected={pathname === '/impressum'} label="Impressum" />
                            <SideNavItem href="/privacy" isSelected={pathname === '/privacy'} label="Privacy" />
                        </SideNavSection>
                    </Stack>
                </SideNav>
            }
            variant="wash"
        >
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-0 end-0 bottom-0 start-0 top-12 overflow-clip lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-30 end-0 bottom-0 start-0 top-12 border-8 border-body bg-transparent lg:start-[260px] lg:top-0"
                padding={0}
                variant="transparent"
            />
            <Stack className="relative z-10" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}
