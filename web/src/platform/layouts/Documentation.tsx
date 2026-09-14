import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useLocation } from 'react-router';
import { SideLayout } from '@/components/layouts/SideLayout';
import { SideNavHeader } from '@/components/layouts/SideNavHeader';
import { documentationSections, type DocumentationIcon } from '@/platform/docs';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import {
    AppWindow,
    BookOpen,
    Building2,
    Database,
    FileCode2,
    FlaskConical,
    Globe,
    HardDrive,
    Package,
    Rocket,
    ShieldCheck,
    Waypoints,
    type LucideIcon,
} from 'lucide-react';

const icons: Record<DocumentationIcon, LucideIcon> = {
    appWindow: AppWindow,
    bookOpen: BookOpen,
    building: Building2,
    database: Database,
    fileCode: FileCode2,
    flask: FlaskConical,
    globe: Globe,
    hardDrive: HardDrive,
    package: Package,
    rocket: Rocket,
    shield: ShieldCheck,
    waypoints: Waypoints,
};

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
                                {section.pages.map((page) => {
                                    const Icon = icons[page.icon];

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
                        ))}
                    </Stack>
                </SideNav>
            }
        >
            <Outlet />
        </SideLayout>
    );
}
