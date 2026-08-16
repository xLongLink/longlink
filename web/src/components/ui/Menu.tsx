import { useLocation } from 'react-router';
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection as AstryxSideNavSection,
} from '@astryxdesign/core/SideNav';
import { Icon } from '@/components/ui/Icon';

type MenuProps = ComponentProps<typeof AstryxSideNav>;
type MenuSectionProps = ComponentProps<typeof AstryxSideNavSection>;
type MenuItemProps = Omit<ComponentProps<typeof AstryxSideNavItem>, 'href' | 'icon' | 'isSelected'> & {
    children?: ReactNode;
    icon?: string;
};
type MenuSubSectionProps = Omit<ComponentProps<typeof AstryxSideNavItem>, 'children' | 'href' | 'isSelected'> & {
    children?: ReactNode;
};
type MenuEntry =
    | { item: ReactElement<MenuItemProps>; kind: 'item' }
    | { kind: 'subsection'; subSection: ReactElement<MenuSubSectionProps> };

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
function isMenuSubSection(node: ReactNode): node is ReactElement<MenuSubSectionProps> {
    return isValidElement(node) && node.type === MenuSubSection;
}

/** Renders section navigation beside the selected item's content. */
export function Menu({ children, ...props }: MenuProps) {
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
            <AstryxSideNav {...props} className="h-auto w-full">
                {sections.map(({ entries, section }) => (
                    <AstryxSideNavSection {...section.props} key={section.props.title}>
                        {entries.map((entry) => {
                            if (entry.kind === 'subsection') {
                                const items = Children.toArray(entry.subSection.props.children).filter(isMenuItem);
                                const { children: _children, ...subSectionProps } = entry.subSection.props;

                                return (
                                    <AstryxSideNavItem {...subSectionProps} collapsible key={subSectionProps.label}>
                                        {items.map((item) => {
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
                                        })}
                                    </AstryxSideNavItem>
                                );
                            }

                            const { children: _children, icon, ...itemProps } = entry.item.props;

                            return (
                                <AstryxSideNavItem
                                    {...itemProps}
                                    icon={icon ? <Icon icon={icon} size="sm" /> : undefined}
                                    href={menuItemHref(itemProps.label)}
                                    isSelected={entry.item === activeItem}
                                    key={itemProps.label}
                                />
                            );
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
export function MenuSubSection(_props: MenuSubSectionProps) {
    return null;
}
