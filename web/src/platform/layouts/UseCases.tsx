import type { ComponentProps } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { comparisonPages, useCasePages } from '@/platform/usecases';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { BookOpen, ClipboardCheck, ExternalLink, FolderKanban, Settings, ShieldCheck } from 'lucide-react';
import {
    Appsmith,
    FastAPI,
    Lovable,
    Microsoft,
    Reflex,
    Replit,
    Retool,
    Superblocks,
    Windmill,
} from '@/components/Brands';

const useCaseIcons = { BookOpen, ClipboardCheck, Settings, ShieldCheck, FolderKanban };
const comparisonIcons = { Retool, Lovable, Windmill, Microsoft, Replit, Appsmith, Superblocks, FastAPI, Reflex };

/** Opens sidebar documentation links in a separate tab. */
function DocumentationLink(props: ComponentProps<'a'>) {
    return <a {...props} rel="noopener noreferrer" target="_blank" />;
}

/** Renders use cases and comparisons in the same sidebar shell as the documentation. */
export default function UseCases() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <SideLayout
            sideNav={
                <SideNav header={<SideNavHeader />}>
                    <Stack paddingInline={2}>
                        {['Introduction', 'Use cases'].map((section) => (
                            <SideNavSection key={section} title={section}>
                                {useCasePages
                                    .filter((page) => page.section === section)
                                    .map((page) => {
                                        // Resolve runtime icons without importing UI into the page catalog.
                                        const Icon = useCaseIcons[page.icon];

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
                                {section === 'Introduction' ? (
                                    <SideNavItem
                                        aria-label="Documentation (opens in a new tab)"
                                        as={DocumentationLink}
                                        endContent={<ExternalLink aria-hidden size={16} />}
                                        href="/docs/"
                                        icon={<BookOpen aria-hidden size={16} />}
                                        label="Documentation"
                                    />
                                ) : null}
                            </SideNavSection>
                        ))}
                        <SideNavSection title="Compare">
                            {comparisonPages.map((page) => {
                                // Keep brand components local to the sidebar runtime.
                                const Icon = comparisonIcons[page.icon];

                                return (
                                    <SideNavItem
                                        key={page.path}
                                        href={`${page.path}/`}
                                        icon={<Icon aria-hidden className="size-4" />}
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
