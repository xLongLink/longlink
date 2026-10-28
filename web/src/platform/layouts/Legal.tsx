import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Building2, FileText, Gem, Image, MessageSquare, ShieldCheck } from 'lucide-react';

/** Renders legal and branding pages with the public article layout. */
export default function Legal() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <Stack minHeight="100dvh">
            <Navbar maxWidth={1272} />
            <Stack className="mx-auto flex-1" maxWidth={1320} width="100%">
                <AppShell
                    className="min-h-0! [&_:has(>.astryx-app-shell-sidenav)]:h-fit! [&_:has(>.astryx-app-shell-sidenav)]:max-h-dvh"
                    height="auto"
                    mobileNav={{ breakpoint: 'lg' }}
                    variant="wash"
                    sideNav={
                        <SideNav aria-label="Legal and branding navigation">
                            <Stack paddingInline={4} paddingBlock={6}>
                                <SideNavSection title="Legal">
                                    <SideNavItem
                                        href="/terms/"
                                        icon={<FileText aria-hidden size={16} />}
                                        isSelected={pagePath === '/terms'}
                                        label="Terms"
                                    />
                                    <SideNavItem
                                        href="/impressum/"
                                        icon={<Building2 aria-hidden size={16} />}
                                        isSelected={pagePath === '/impressum'}
                                        label="Impressum"
                                    />
                                    <SideNavItem
                                        href="/privacy/"
                                        icon={<ShieldCheck aria-hidden size={16} />}
                                        isSelected={pagePath === '/privacy'}
                                        label="Privacy"
                                    />
                                </SideNavSection>
                                <SideNavSection title="Branding">
                                    <SideNavItem
                                        href="/branding/assets"
                                        icon={<Image aria-hidden size={16} />}
                                        isSelected={pagePath === '/branding/assets'}
                                        label="Brand assets"
                                    />
                                    <SideNavItem
                                        href="/branding/values"
                                        icon={<Gem aria-hidden size={16} />}
                                        isSelected={pagePath === '/branding/values'}
                                        label="Values"
                                    />
                                    <SideNavItem
                                        href="/branding/comunication"
                                        icon={<MessageSquare aria-hidden size={16} />}
                                        isSelected={pagePath === '/branding/comunication'}
                                        label="Communication"
                                    />
                                </SideNavSection>
                            </Stack>
                        </SideNav>
                    }
                >
                    <Outlet />
                </AppShell>
            </Stack>
            <Footer maxWidth={1272} />
        </Stack>
    );
}
