import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { BookOpen, ClipboardCheck, FolderKanban, Settings, ShieldCheck } from 'lucide-react';
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
                        <SideNavSection title="Compare">
                            <SideNavItem
                                href="/use-cases/longlink-vs-retool/"
                                icon={<Retool aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-retool'}
                                label="Retool"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-lovable/"
                                icon={<Lovable aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-lovable'}
                                label="Lovable"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-windmill/"
                                icon={<Windmill aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-windmill'}
                                label="Windmill"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-microsoft-power-apps/"
                                icon={<Microsoft aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-microsoft-power-apps'}
                                label="Microsoft Power Apps"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-replit/"
                                icon={<Replit aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-replit'}
                                label="Replit"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-appsmith/"
                                icon={<Appsmith aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-appsmith'}
                                label="Appsmith"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-superblocks/"
                                icon={<Superblocks aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-superblocks'}
                                label="Superblocks"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-fastapi/"
                                icon={<FastAPI aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-fastapi'}
                                label="FastAPI"
                            />
                            <SideNavItem
                                href="/use-cases/longlink-vs-reflex/"
                                icon={<Reflex aria-hidden className="size-4" />}
                                isSelected={pagePath === '/use-cases/longlink-vs-reflex'}
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
