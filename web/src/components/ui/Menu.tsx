import { useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { Icon, type StoneIconName } from '@/components/ui/Icon';
import { Layout, LayoutPanel } from '@astryxdesign/core/Layout';
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection as AstryxSideNavSection,
} from '@astryxdesign/core/SideNav';

type MenuSectionProps = {
    children?: ReactNode;
    isHeaderHidden?: boolean;
    title: string;
};
type MenuMarkerProps = {
    children?: ReactNode;
    icon?: StoneIconName;
    label: string;
};
type MenuEntry =
    | { item: ReactElement<MenuMarkerProps>; kind: 'item' }
    | { items: ReactElement<MenuMarkerProps>[]; kind: 'subsection'; subSection: ReactElement<MenuMarkerProps> };

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

/** Returns whether a node defines selectable menu content. */
function isMenuItem(node: ReactNode): node is ReactElement<MenuMarkerProps> {
    return isValidElement(node) && node.type === MenuItem;
}

/** Returns whether a node groups nested menu items. */
function isMenuSubSection(node: ReactNode): node is ReactElement<MenuMarkerProps> {
    return isValidElement(node) && node.type === MenuSubSection;
}

/** Renders section navigation beside the selected item's content. */
export function Menu({ children, gap = 3 }: { children?: ReactNode; gap?: ComponentProps<typeof Stack>['gap'] }) {
    const { hash } = useLocation();
    const sections = Children.toArray(children)
        .filter((child): child is ReactElement<MenuSectionProps> => isValidElement(child) && child.type === MenuSection)
        .map((section) => ({
            entries: Children.toArray(section.props.children).flatMap<MenuEntry>((child) => {
                if (isMenuItem(child)) {
                    return [{ item: child, kind: 'item' as const }];
                }

                if (isMenuSubSection(child)) {
                    return [
                        {
                            items: Children.toArray(child.props.children).filter(isMenuItem),
                            kind: 'subsection' as const,
                            subSection: child,
                        },
                    ];
                }

                return [];
            }),
            section,
        }));
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) => (entry.kind === 'subsection' ? entry.items : [entry.item]))
    );
    const activeItem = items.find((item) => menuItemHref(item.props.label) === hash) ?? items[0];

    return (
        <Layout
            height="auto"
            start={
                <LayoutPanel isScrollable={false} label="Settings navigation" padding={0} role="navigation" width={260}>
                    <AstryxSideNav className="w-full pr-4 [&>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pl-0">
                        {sections.map(({ entries, section }) => {
                            const { children: _children, ...sectionProps } = section.props;

                            return (
                                <AstryxSideNavSection {...sectionProps} className="pt-0" key={sectionProps.title}>
                                    {entries.map((entry) => {
                                        if (entry.kind === 'subsection') {
                                            const { icon, label } = entry.subSection.props;

                                            return (
                                                <AstryxSideNavItem
                                                    collapsible={{ defaultIsCollapsed: true }}
                                                    icon={renderMenuIcon(icon)}
                                                    key={label}
                                                    label={label}
                                                >
                                                    {entry.items.map((item) => (
                                                        <AstryxSideNavItem
                                                            href={menuItemHref(item.props.label)}
                                                            icon={renderMenuIcon(item.props.icon)}
                                                            isSelected={item === activeItem}
                                                            key={item.props.label}
                                                            label={item.props.label}
                                                        />
                                                    ))}
                                                </AstryxSideNavItem>
                                            );
                                        }

                                        return (
                                            <AstryxSideNavItem
                                                href={menuItemHref(entry.item.props.label)}
                                                icon={renderMenuIcon(entry.item.props.icon)}
                                                isSelected={entry.item === activeItem}
                                                key={entry.item.props.label}
                                                label={entry.item.props.label}
                                            />
                                        );
                                    })}
                                </AstryxSideNavSection>
                            );
                        })}
                    </AstryxSideNav>
                </LayoutPanel>
            }
        >
            <Stack gap={gap}>{activeItem?.props.children}</Stack>
        </Layout>
    );
}

/** Defines a navigation section for Menu. */
export function MenuSection(_props: MenuSectionProps) {
    return null;
}

/** Defines a navigation item and its associated content for Menu. */
export function MenuItem(_props: MenuMarkerProps) {
    return null;
}

/** Defines a collapsible group of related MenuItems. */
export function MenuSubSection(_props: MenuMarkerProps) {
    return null;
}
