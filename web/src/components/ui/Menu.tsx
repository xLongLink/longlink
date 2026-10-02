import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import type { ComponentProps, ReactNode } from 'react';
import { Icon, type StoneIconName } from '@/components/ui/Icon';
import { Layout, LayoutPanel } from '@astryxdesign/core/Layout';
import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection as AstryxSideNavSection,
} from '@astryxdesign/core/SideNav';

type MenuSection = {
    entries: MenuEntry[];
    isHeaderHidden?: boolean;
    title: string;
};
type MenuItem = {
    content?: ReactNode;
    id: string;
    icon?: StoneIconName;
    kind: 'item';
    label: string;
};
type MenuEntry = MenuItem | { icon?: StoneIconName; items: MenuItem[]; kind: 'subsection'; label: string };

/** Renders section navigation beside the selected item's content. */
export function Menu({ sections, gap = 3 }: { sections: MenuSection[]; gap?: ComponentProps<typeof Stack>['gap'] }) {
    const { hash } = useLocation();

    // Resolve selection once from stable item identifiers.
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) => (entry.kind === 'subsection' ? entry.items : [entry]))
    );
    const activeItem = items.find((item) => `#${item.id}` === hash) ?? items[0];

    /** Renders direct and nested items with the same navigation and selection behavior. */
    function renderItem(item: MenuItem) {
        return (
            <AstryxSideNavItem
                href={`#${item.id}`}
                icon={item.icon ? <Icon icon={item.icon} size="sm" /> : undefined}
                isSelected={item === activeItem}
                key={item.id}
                label={item.label}
            />
        );
    }

    return (
        <Layout
            height="auto"
            start={
                <LayoutPanel isScrollable={false} label="Settings navigation" padding={0} role="navigation" width={260}>
                    <AstryxSideNav className="w-full pr-4 [&>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pl-0">
                        {sections.map(({ entries, ...section }) => {
                            return (
                                <AstryxSideNavSection {...section} className="pt-0" key={section.title}>
                                    {entries.map((entry) => {
                                        if (entry.kind === 'subsection') {
                                            const { icon, label } = entry;

                                            return (
                                                <AstryxSideNavItem
                                                    collapsible={{ defaultIsCollapsed: true }}
                                                    icon={icon ? <Icon icon={icon} size="sm" /> : undefined}
                                                    key={label}
                                                    label={label}
                                                >
                                                    {entry.items.map(renderItem)}
                                                </AstryxSideNavItem>
                                            );
                                        }

                                        return renderItem(entry);
                                    })}
                                </AstryxSideNavSection>
                            );
                        })}
                    </AstryxSideNav>
                </LayoutPanel>
            }
        >
            <Stack gap={gap}>{activeItem?.content}</Stack>
        </Layout>
    );
}
