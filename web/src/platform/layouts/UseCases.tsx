import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { BookOpen, ClipboardCheck, FolderKanban, Settings, ShieldCheck } from 'lucide-react';

/** Renders use cases in the same sidebar shell as the documentation. */
export default function UseCases() {
    const { pathname } = useLocation();
    const pagePath = pathname.replace(/\/+$/, '') || '/';

    return (
        <SideLayout
            sideNav={
                <SideNav header={<SideNavHeader />}>
                    <Stack paddingInline={2}>
                        <SideNavSection title="Introduction">
                            <SideNavItem
                                href="/use-cases/"
                                icon={<BookOpen aria-hidden size={16} />}
                                isSelected={pagePath === '/use-cases'}
                                label="Why LongLink"
                            />
                        </SideNavSection>
                        <SideNavSection title="Use cases">
                            <SideNavItem
                                href="/use-cases/approvals-and-decisions/"
                                icon={<ClipboardCheck aria-hidden size={16} />}
                                isSelected={pagePath === '/use-cases/approvals-and-decisions'}
                                label="Approvals & decisions"
                            />
                            <SideNavItem
                                href="/use-cases/operations/"
                                icon={<Settings aria-hidden size={16} />}
                                isSelected={pagePath === '/use-cases/operations'}
                                label="Operations"
                            />
                            <SideNavItem
                                href="/use-cases/compliance-and-quality/"
                                icon={<ShieldCheck aria-hidden size={16} />}
                                isSelected={pagePath === '/use-cases/compliance-and-quality'}
                                label="Compliance & quality"
                            />
                            <SideNavItem
                                href="/use-cases/cases-and-projects/"
                                icon={<FolderKanban aria-hidden size={16} />}
                                isSelected={pagePath === '/use-cases/cases-and-projects'}
                                label="Cases & projects"
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
