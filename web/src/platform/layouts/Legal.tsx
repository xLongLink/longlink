import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import Publication from '@/components/layouts/Publication';
import { legalPages, brandingPages } from '@/platform/publications';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

/** Renders legal and branding pages with the public article layout. */
export default function Legal() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <Publication
            className="min-h-0! [&_:has(>.astryx-app-shell-sidenav)]:h-fit! [&_:has(>.astryx-app-shell-sidenav)]:max-h-dvh"
            sideNav={
                <SideNav aria-label="Legal and branding navigation">
                    <Stack paddingInline={4} paddingBlock={6}>
                        <SideNavSection title="Legal">
                            {legalPages.map((page) => (
                                <SideNavItem
                                    key={page.path}
                                    href={`${page.path}/`}
                                    icon={<page.icon aria-hidden size={16} />}
                                    isSelected={pagePath === page.path}
                                    label={page.label}
                                />
                            ))}
                        </SideNavSection>
                        <SideNavSection title="Branding">
                            {brandingPages.map((page) => (
                                <SideNavItem
                                    key={page.path}
                                    href={page.path}
                                    icon={<page.icon aria-hidden size={16} />}
                                    isSelected={pagePath === page.path}
                                    label={page.label}
                                />
                            ))}
                        </SideNavSection>
                    </Stack>
                </SideNav>
            }
        />
    );
}
