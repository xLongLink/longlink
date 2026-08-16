import { useLocation } from 'react-router';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection as AstryxSideNavSection,
} from '@astryxdesign/core/SideNav';
import { Icon } from '@/components/ui/Icon';
import type { StoneIconName } from '@/icons';

type MenuProps = { children?: ReactNode };
type MenuSectionProps = {
    children?: ReactNode;
    isHeaderHidden?: boolean;
    title: string;
};
type MenuItemProps = {
    children?: ReactNode;
    icon?: StoneIconName;
    label: string;
};
type MenuEntry =
    | { item: ReactElement<MenuItemProps>; kind: 'item' }
    | { kind: 'subsection'; subSection: ReactElement<MenuItemProps> };

/** Converts a menu label into its hash navigation target. */
function menuItemHref(label: string): string {
    return `#${label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;
}

/** Returns whether a node defines selectable menu content. */
function isMenuItem(node: ReactNode): node is ReactElement<MenuItemProps> {
    return isValidElement(node) && node.type === MenuItem;
}

/** Returns whether a node groups nested menu items. */
function isMenuSubSection(node: ReactNode): node is ReactElement<MenuItemProps> {
    return isValidElement(node) && node.type === MenuSubSection;
}

/** Renders a selectable SideNav item from its Menu marker. */
function renderMenuItem(item: ReactElement<MenuItemProps>, activeItem: ReactElement<MenuItemProps> | undefined) {
    const { children: _children, icon, ...itemProps } = item.props;

    return (
        <AstryxSideNavItem
            {...itemProps}
            icon={icon ? <Icon icon={icon} size="sm" /> : undefined}
            href={menuItemHref(itemProps.label)}
            isSelected={item === activeItem}
            key={itemProps.label}
        />
    );
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
        <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <AstryxSideNav className="h-auto w-full">
                {sections.map(({ entries, section }) => (
                    <AstryxSideNavSection {...section.props} key={section.props.title}>
                        {entries.map((entry) => {
                            if (entry.kind === 'subsection') {
                                const items = Children.toArray(entry.subSection.props.children).filter(isMenuItem);
                                const { children: _children, ...subSectionProps } = entry.subSection.props;

                                return (
                                    <AstryxSideNavItem {...subSectionProps} collapsible key={subSectionProps.label}>
                                        {items.map((item) => renderMenuItem(item, activeItem))}
                                    </AstryxSideNavItem>
                                );
                            }

                            return renderMenuItem(entry.item, activeItem);
                        })}
                    </AstryxSideNavSection>
                ))}
            </AstryxSideNav>
            <div className="min-w-0">{activeItem?.props.children}</div>
        </div>
    );
}

/** Defines a navigation section for Menu. */
export function MenuSection(_props: MenuSectionProps) {
    return null;
}

/** Defines a navigation item and its associated content for Menu. */
export function MenuItem(_props: MenuItemProps) {
    return null;
}

/** Defines a collapsible group of related MenuItems. */
export function MenuSubSection(_props: MenuItemProps) {
    return null;
}
