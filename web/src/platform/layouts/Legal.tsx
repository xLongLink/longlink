import { legalPages } from '@/platform/legal';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { brandingPages } from '@/platform/branding';
import { SideLayout } from '@/components/layouts/SideLayout';
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
                            {legalPages.map((page) => {
                                // Preserve each legal destination's label, icon, and selected state.
                                const Icon = page.icon;

                                return (
                                    <SideNavItem
                                        key={page.path}
                                        href={`${page.path}/`}
                                        icon={<Icon aria-hidden size={16} />}
                                        isSelected={pagePath === page.path}
                                        label={page.label}
                                    />
                                );
                            })}
                        </SideNavSection>
                        <SideNavSection title="Branding">
                            {brandingPages.map((page) => {
                                // Preserve branding destinations without a trailing slash.
                                const Icon = page.icon;

                                return (
                                    <SideNavItem
                                        key={page.path}
                                        href={page.path}
                                        icon={<Icon aria-hidden size={16} />}
                                        isSelected={pagePath === page.path}
                                        label={page.label}
                                    />
                                );
                            })}
                        </SideNavSection>
                    </Stack>
                </SideNav>
            }
        >
            <Outlet />
        </SideLayout>
    );
}
