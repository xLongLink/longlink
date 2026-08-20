import { useLocation } from 'react-router';
import { Icon, type StoneIconName } from '@/components/ui/Icon';
import { Layout, LayoutPanel } from '@astryxdesign/core/Layout';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection as AstryxSideNavSection,
} from '@astryxdesign/core/SideNav';

type MenuProps = { children?: ReactNode };
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
    | { kind: 'subsection'; subSection: ReactElement<MenuMarkerProps> };

/** Converts a menu label into its hash navigation target. */
function menuItemHref(label: string): string {
    return `#${label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;
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
export function Menu({ children }: MenuProps) {
    const { hash } = useLocation();
    const sections = Children.toArray(children)
        .filter((child): child is ReactElement<MenuSectionProps> => isValidElement(child) && child.type === MenuSection)
        .map((section) => ({
            entries: Children.toArray(section.props.children).flatMap<MenuEntry>((child) => {
                if (isMenuItem(child)) {
                    return [{ item: child, kind: 'item' as const }];
                }

                if (isMenuSubSection(child)) {
                    return [{ kind: 'subsection' as const, subSection: child }];
                }

                return [];
            }),
            section,
        }));
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) =>
            entry.kind === 'subsection'
                ? Children.toArray(entry.subSection.props.children).filter(isMenuItem)
                : [entry.item]
        )
    );
    const activeItem = items.find((item) => menuItemHref(item.props.label) === hash) ?? items[0];

    return (
        <Layout
            height="auto"
            start={
                <LayoutPanel isScrollable={false} label="Settings navigation" padding={0} role="navigation" width={260}>
                    <AstryxSideNav className="w-full pr-4">
                        {sections.map(({ entries, section }) => (
                            <AstryxSideNavSection {...section.props} key={section.props.title}>
                                {entries.map((entry) => {
                                    if (entry.kind === 'subsection') {
                                        const items = Children.toArray(entry.subSection.props.children).filter(
                                            isMenuItem
                                        );
                                        const { icon, label } = entry.subSection.props;

                                        return (
                                            <AstryxSideNavItem
                                                collapsible
                                                icon={icon ? <Icon icon={icon} size="sm" /> : undefined}
                                                key={label}
                                                label={label}
                                            >
                                                {items.map((item) => (
                                                    <AstryxSideNavItem
                                                        href={menuItemHref(item.props.label)}
                                                        icon={
                                                            item.props.icon ? (
                                                                <Icon icon={item.props.icon} size="sm" />
                                                            ) : undefined
                                                        }
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
                                            icon={
                                                entry.item.props.icon ? (
                                                    <Icon icon={entry.item.props.icon} size="sm" />
                                                ) : undefined
                                            }
                                            isSelected={entry.item === activeItem}
                                            key={entry.item.props.label}
                                            label={entry.item.props.label}
                                        />
                                    );
                                })}
                            </AstryxSideNavSection>
                        ))}
                    </AstryxSideNav>
                </LayoutPanel>
            }
        >
            {activeItem?.props.children}
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
