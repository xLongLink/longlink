import { Stack } from '@astryxdesign/core/Stack';
import { Icon, type StoneIconName } from '@/components/ui/Icon';
import { Layout, LayoutPanel } from '@astryxdesign/core/Layout';
import {
    SideNav as AstryxSideNav,
    SideNavItem as AstryxSideNavItem,
    SideNavSection as AstryxSideNavSection,
} from '@astryxdesign/core/SideNav';
import {
    Children,
    createContext,
    isValidElement,
    useContext,
    type ComponentProps,
    type ReactElement,
    type ReactNode,
} from 'react';

type MenuSectionProps = {
    children?: ReactNode;
    isHeaderHidden?: boolean;
    title: string;
};
type MenuItemProps = {
    children?: ReactNode;
    id?: string;
    icon?: StoneIconName;
    label: string;
};
type MenuEntry =
    | { kind: 'item'; item: ReactElement<MenuItemProps> }
    | { kind: 'subsection'; group: ReactElement<MenuItemProps>; items: ReactElement<MenuItemProps>[] };

// Each runtime supplies its own fragment navigation without exposing a router to Views.
export const MenuNavigationContext = createContext<{ hash: string; select: (id: string) => void } | null>(null);

/** Uses an explicit item ID or the original label-derived fragment. */
function menuItemId(item: ReactElement<MenuItemProps>): string {
    return (
        item.props.id ??
        item.props.label
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
    );
}

/** Identifies a content-owning MenuItem without rendering its children. */
function isMenuItem(child: ReactNode): child is ReactElement<MenuItemProps> {
    return isValidElement(child) && child.type === MenuItem;
}

/** Renders section navigation beside the selected item's content. */
export function Menu({ children, gap = 3 }: { children?: ReactNode; gap?: ComponentProps<typeof Stack>['gap'] }) {
    const navigation = useContext(MenuNavigationContext);

    // Require the runtime-owned navigation API, not a React Router provider.
    if (navigation === null) throw new Error('Menu requires MenuNavigationContext');
    const { hash, select } = navigation;

    // Read the JSX sections and groups without mounting inactive content.
    const sections = Children.toArray(children)
        .filter((child): child is ReactElement<MenuSectionProps> => isValidElement(child) && child.type === MenuSection)
        .map((section) => ({
            section,
            entries: Children.toArray(section.props.children).flatMap<MenuEntry>((child) => {
                if (isMenuItem(child)) return [{ kind: 'item', item: child }];
                if (isValidElement<MenuItemProps>(child) && child.type === MenuSubSection) {
                    return [
                        {
                            kind: 'subsection',
                            group: child,
                            items: Children.toArray(child.props.children).filter(isMenuItem),
                        },
                    ];
                }
                return [];
            }),
        }));

    // Resolve selection once from stable item identifiers.
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) => (entry.kind === 'subsection' ? entry.items : [entry.item]))
    );
    const activeItem = items.find((item) => `#${menuItemId(item)}` === hash) ?? items[0];

    /** Renders direct and nested items with the same navigation and selection behavior. */
    function renderItem(item: ReactElement<MenuItemProps>) {
        const id = menuItemId(item);

        // Preserve normal link semantics while routing ordinary clicks through the runtime API.
        return (
            <AstryxSideNavItem
                href={`#${id}`}
                icon={item.props.icon ? <Icon icon={item.props.icon} size="sm" /> : undefined}
                isSelected={item === activeItem}
                key={id}
                label={item.props.label}
                onClick={(event) => {
                    if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.altKey ||
                        event.ctrlKey ||
                        event.metaKey ||
                        event.shiftKey
                    )
                        return;
                    event.preventDefault();
                    select(id);
                }}
            />
        );
    }

    return (
        <Layout
            height="auto"
            start={
                <LayoutPanel isScrollable={false} label="Settings navigation" padding={0} role="navigation" width={260}>
                    <AstryxSideNav className="h-auto w-full pr-4 [&>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pt-0 [&_.astryx-side-nav-section>div:first-child]:pl-0">
                        {sections.map(({ entries, section }) => (
                            <AstryxSideNavSection
                                title={section.props.title}
                                isHeaderHidden={section.props.isHeaderHidden}
                                className="pt-0"
                                key={section.props.title}
                            >
                                {entries.map((entry) => {
                                    if (entry.kind === 'subsection') {
                                        const { icon, label } = entry.group.props;

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

                                    return renderItem(entry.item);
                                })}
                            </AstryxSideNavSection>
                        ))}
                    </AstryxSideNav>
                </LayoutPanel>
            }
        >
            <Stack gap={gap}>{activeItem?.props.children}</Stack>
        </Layout>
    );
}

/** Defines a Menu section without mounting its content separately. */
export function MenuSection(_props: MenuSectionProps) {
    return null;
}

/** Defines a selectable item and its associated content. */
export function MenuItem(_props: MenuItemProps) {
    return null;
}

/** Defines a collapsible group of MenuItems. */
export function MenuSubSection(_props: Omit<MenuItemProps, 'id'>) {
    return null;
}
