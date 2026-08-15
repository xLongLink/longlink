import { useLocation } from 'react-router';
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection as AstryxSideNavSection,
} from '@astryxdesign/core/SideNav';

type MenuProps = ComponentProps<typeof AstryxSideNav>;
type MenuSectionProps = ComponentProps<typeof AstryxSideNavSection>;
type MenuItemProps = Omit<ComponentProps<typeof AstryxSideNavItem>, 'href' | 'isSelected'> & { children?: ReactNode };

/** Converts a menu label into its hash navigation target. */
function menuItemHref(label: string): string {
    return `#${label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`;
}

/** Renders section navigation beside the selected item's content. */
export function Menu({ children, ...props }: MenuProps) {
    const { hash } = useLocation();
    const sections = Children.toArray(children)
        .filter((child): child is ReactElement<MenuSectionProps> => isValidElement(child) && child.type === MenuSection)
        .map((section) => ({
            items: Children.toArray(section.props.children).filter(
                (child): child is ReactElement<MenuItemProps> => isValidElement(child) && child.type === MenuItem
            ),
            section,
        }));
    const items = sections.flatMap((section) => section.items);
    const activeItem = items.find((item) => menuItemHref(item.props.label) === hash) ?? items[0];

    return (
        <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <AstryxSideNav {...props} className="h-auto w-full">
                {sections.map(({ items, section }) => (
                    <AstryxSideNavSection {...section.props} key={section.props.title}>
                        {items.map((item) => {
                            const { children: _children, ...itemProps } = item.props;

                            return (
                                <AstryxSideNavItem
                                    {...itemProps}
                                    href={menuItemHref(itemProps.label)}
                                    isSelected={item === activeItem}
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
