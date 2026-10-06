import type { ComponentProps } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { BookOpen, ExternalLink } from 'lucide-react';
import { documentationSections } from '@/platform/docs';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';

/** Opens the Why LongLink sidebar link in a separate tab. */
function WhyLongLink(props: ComponentProps<'a'>) {
    return <a {...props} rel="noopener noreferrer" target="_blank" />;
}

/** Renders documentation content with the fixed documentation navigation. */
export default function Documentation() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <SideLayout
            sideNav={
                <SideNav header={<SideNavHeader />}>
                    <Stack paddingInline={2}>
                        {documentationSections.map((section) => (
                            <SideNavSection key={section.title} title={section.title}>
                                {section.pages.map((page) => (
                                    <SideNavItem
                                        key={page.path}
                                        href={`${page.path}/`}
                                        icon={<page.icon aria-hidden size={16} />}
                                        isSelected={pagePath === page.path}
                                        label={page.label}
                                    />
                                ))}
                                {section.title === 'Introduction' ? (
                                    <SideNavItem
                                        aria-label="Why LongLink (opens in a new tab)"
                                        as={WhyLongLink}
                                        endContent={<ExternalLink aria-hidden size={16} />}
                                        href="/use-cases/"
                                        icon={<BookOpen aria-hidden size={16} />}
                                        label="Why LongLink"
                                    />
                                ) : null}
                            </SideNavSection>
                        ))}
                    </Stack>
                </SideNav>
            }
        >
            <Outlet />
        </SideLayout>
    );
}
