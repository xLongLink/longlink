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

export type MenuSection = {
    entries: MenuEntry[];
    isHeaderHidden?: boolean;
    title: string;
};
export type MenuItem = {
    content?: ReactNode;
    icon?: StoneIconName;
    kind: 'item';
    label: string;
};
export type MenuEntry = MenuItem | { icon?: StoneIconName; items: MenuItem[]; kind: 'subsection'; label: string };

/** Converts a menu label into its hash navigation target. */
function menuItemHref(label: string): string {
    return `#${label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;
}

/** Renders a menu icon when one is configured. */
function renderMenuIcon(icon: StoneIconName | undefined) {
    return icon ? <Icon icon={icon} size="sm" /> : undefined;
}

/** Renders section navigation beside the selected item's content. */
export function Menu({ sections, gap = 3 }: { sections: MenuSection[]; gap?: ComponentProps<typeof Stack>['gap'] }) {
    const { hash } = useLocation();

    // Preserve label-based hashes and select the first match, including slug collisions.
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) => (entry.kind === 'subsection' ? entry.items : [entry]))
    );
    const activeItem = items.find((item) => menuItemHref(item.label) === hash) ?? items[0];

    /** Renders direct and nested items with the same navigation and selection behavior. */
    function renderItem(item: MenuItem) {
        return (
            <AstryxSideNavItem
                href={menuItemHref(item.label)}
                icon={renderMenuIcon(item.icon)}
                isSelected={item === activeItem}
                key={item.label}
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
                                                    icon={renderMenuIcon(icon)}
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
