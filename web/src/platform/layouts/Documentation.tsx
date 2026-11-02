import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import Publication from '@/components/layouts/Publication';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { documentationIntroduction, documentationNavigation } from '@/platform/publications';

/** Renders documentation with section navigation, article, and outline columns. */
export default function Documentation() {
    const { pathname, hash } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    // Resolve the tab and its sidebar sections from the same navigation hierarchy.
    const activeGroup =
        documentationNavigation.find(({ path }) => pagePath === path || pagePath.startsWith(`${path}/`)) ??
        documentationNavigation[0];

    const sections = [documentationIntroduction, ...activeGroup.sections];

    return (
        <Publication
            navigation={
                <TabList aria-label="Documentation sections" value={activeGroup.path} onChange={() => undefined}>
                    {documentationNavigation.map((group) => (
                        <Tab key={group.path} href={`${group.path}/`} label={group.label} value={group.path} />
                    ))}
                </TabList>
            }
            sideNav={
                <SideNav aria-label="Documentation navigation">
                    <Stack paddingInline={4} paddingBlock={6}>
                        {sections.map((section) => (
                            <SideNavSection key={section.title} title={section.title}>
                                {section.pages.map((page) => (
                                    <SideNavItem
                                        key={page.path}
                                        href={page.children?.length ? undefined : `${page.path}/`}
                                        icon={page.children?.length ? undefined : <page.icon aria-hidden size={16} />}
                                        isSelected={`${pagePath}${hash}` === page.path}
                                        label={page.label}
                                        collapsible={page.children?.length ? { defaultIsCollapsed: true } : false}
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
        />
    );
}
