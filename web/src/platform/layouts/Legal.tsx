import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { Building2, FileText, ShieldCheck } from 'lucide-react';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

/** Renders legal content with the fixed legal navigation. */
export default function Legal() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <SideLayout
            sideNav={
                <SideNav header={<SideNavHeader />}>
                    <Stack paddingInline={2}>
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
                    </Stack>
                </SideNav>
            }
        >
            <Outlet />
        </SideLayout>
    );
}
