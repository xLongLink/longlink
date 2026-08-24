import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

/** Renders legal content with the fixed legal navigation. */
export default function Legal() {
    const { pathname } = useLocation();

    return (
        <SideLayout
            sideNav={
                <SideNav header={<SideNavHeader />}>
                    <Stack paddingInline={2}>
                        <SideNavSection title="Legal">
                            <SideNavItem href="/terms" isSelected={pathname === '/terms'} label="Terms" />
                            <SideNavItem href="/impressum" isSelected={pathname === '/impressum'} label="Impressum" />
                            <SideNavItem href="/privacy" isSelected={pathname === '/privacy'} label="Privacy" />
                        </SideNavSection>
                    </Stack>
                </SideNav>
            }
        >
            <Outlet />
        </SideLayout>
    );
}
