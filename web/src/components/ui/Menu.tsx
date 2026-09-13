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
    id: string;
    icon?: StoneIconName;
    kind: 'item';
    label: string;
};
export type MenuEntry = MenuItem | { icon?: StoneIconName; items: MenuItem[]; kind: 'subsection'; label: string };

/** Converts a menu label into its default stable identifier. */
export function menuItemId(label: string): string {
    return label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Resolves a URL hash to a known item, falling back to the first item. */
export function resolveMenuItemId(itemIds: readonly string[], hash: string): string | undefined {
    return itemIds.find((id) => `#${id}` === hash) ?? itemIds[0];
}

/** Renders a menu icon when one is configured. */
function renderMenuIcon(icon: StoneIconName | undefined) {
    return icon ? <Icon icon={icon} size="sm" /> : undefined;
}

/** Renders section navigation beside the selected item's content. */
export function Menu({ sections, gap = 3 }: { sections: MenuSection[]; gap?: ComponentProps<typeof Stack>['gap'] }) {
    const { hash } = useLocation();

    // Resolve selection once from stable item identifiers.
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) => (entry.kind === 'subsection' ? entry.items : [entry]))
    );
    const activeItemId = resolveMenuItemId(
        items.map((item) => item.id),
        hash
    );
    const activeItem = items.find((item) => item.id === activeItemId);

    /** Renders direct and nested items with the same navigation and selection behavior. */
    function renderItem(item: MenuItem) {
        return (
            <AstryxSideNavItem
                href={`#${item.id}`}
                icon={renderMenuIcon(item.icon)}
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
