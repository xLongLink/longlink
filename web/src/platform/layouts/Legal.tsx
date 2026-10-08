import { legalPages } from '@/platform/legal';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { Gem, Image, MessageSquare } from 'lucide-react';
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
        </SideLayout>
    );
}
