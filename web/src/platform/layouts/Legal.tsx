import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Outlet, useLocation } from 'react-router';
import { Divider } from '@astryxdesign/core/Divider';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

/** Renders legal content with the fixed legal navigation. */
export default function Legal() {
    const { pathname } = useLocation();

    return (
        <SideLayout
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
        >
            <Outlet />
        </SideLayout>
    );
}
