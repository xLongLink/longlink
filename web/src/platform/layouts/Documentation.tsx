import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { AppShell } from '@astryxdesign/core/AppShell';
import { documentationSections } from '@/platform/routes';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

/** Renders documentation with section navigation, article, and outline columns. */
export default function Documentation() {
    const { pathname, hash } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    const activeSection =
        pagePath === '/docs/alternatives' || pagePath.startsWith('/docs/alternatives/')
            ? 'Alternatives'
            : pagePath === '/docs/api' || pagePath.startsWith('/docs/api/')
              ? 'Platform'
              : 'Solutions';

    const sections = documentationSections.filter(
        (section) =>
            section.title === 'Introduction' ||
            section.title === activeSection ||
            (activeSection === 'Platform' && section.title === 'Self hosted') ||
            (activeSection === 'Solutions' && section.title === 'Views')
    );

    return (
        <Stack minHeight="100dvh">
            <Navbar
                maxWidth={1272}
                navigation={
                    <TabList aria-label="Documentation sections" value={activeSection} onChange={() => undefined}>
                        <Tab href="/docs/sdk/" label="Solutions" value="Solutions" />
                        <Tab href="/docs/api/" label="Platform" value="Platform" />
                        <Tab href="/docs/alternatives/" label="Alternatives" value="Alternatives" />
                    </TabList>
                }
            />
            <Stack className="mx-auto flex-1" maxWidth={1320} width="100%">
                <AppShell
                    className="min-h-0!"
                    height="auto"
                    mobileNav={{ breakpoint: 'lg' }}
                    variant="wash"
                    sideNav={
                        <SideNav aria-label="Documentation navigation">
                            <Stack paddingInline={4} paddingBlock={6}>
                                {sections.map((section) => (
                                    <SideNavSection key={section.title} title={section.title}>
                                        {section.pages.map((page) => (
                                            <SideNavItem
                                                key={page.path}
                                                href={page.children?.length ? undefined : `${page.path}/`}
                                                icon={
                                                    page.children?.length ? undefined : (
                                                        <page.icon aria-hidden size={16} />
                                                    )
                                                }
                                                isSelected={`${pagePath}${hash}` === page.path}
                                                label={page.label}
                                                collapsible={
                                                    page.children?.length ? { defaultIsCollapsed: true } : false
                                                }
                                            >
                                                {page.children?.map((child) => (
                                                    <SideNavItem
                                                        key={child.path}
                                                        href={`${child.path}/`}
                                                        icon={<child.icon aria-hidden size={16} />}
                                                        isSelected={pagePath === child.path}
                                                        label={child.label}
                                                    />
                                                ))}
                                            </SideNavItem>
                                        ))}
                                    </SideNavSection>
                                ))}
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
