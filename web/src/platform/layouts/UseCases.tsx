import type { ComponentProps } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
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
                        <SideNavSection title="Introduction">
                            <SideNavItem
                                href="/use-cases/"
                                icon={<BookOpen aria-hidden size={16} />}
                                isSelected={pagePath === '/use-cases'}
                                label="Why LongLink"
                            />
                            <SideNavItem
                                aria-label="Documentation (opens in a new tab)"
                                as={DocumentationLink}
                                endContent={<ExternalLink aria-hidden size={16} />}
                                href="/docs/"
                                icon={<BookOpen aria-hidden size={16} />}
                                label="Documentation"
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
                        <SideNavSection title="Compare">
                            <SideNavItem
                                href="/compare/longlink-vs-retool/"
                                icon={<Retool aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-retool'}
                                label="Retool"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-lovable/"
                                icon={<Lovable aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-lovable'}
                                label="Lovable"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-windmill/"
                                icon={<Windmill aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-windmill'}
                                label="Windmill"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-microsoft-power-apps/"
                                icon={<Microsoft aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-microsoft-power-apps'}
                                label="Microsoft Power Apps"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-replit/"
                                icon={<Replit aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-replit'}
                                label="Replit"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-appsmith/"
                                icon={<Appsmith aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-appsmith'}
                                label="Appsmith"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-superblocks/"
                                icon={<Superblocks aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-superblocks'}
                                label="Superblocks"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-fastapi/"
                                icon={<FastAPI aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-fastapi'}
                                label="FastAPI"
                            />
                            <SideNavItem
                                href="/compare/longlink-vs-reflex/"
                                icon={<Reflex aria-hidden className="size-4" />}
                                isSelected={pagePath === '/compare/longlink-vs-reflex'}
                                label="Reflex"
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
