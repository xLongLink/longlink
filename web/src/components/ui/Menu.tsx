import { spacing } from './layout';
import type { Spacing } from './types';
import { ChevronDown } from 'lucide-react';
import { MenuNavigationContext } from './contexts';
import { Icon, type StoneIconName } from '@/components/ui/Icon';
import { Children, isValidElement, useContext, type ReactElement, type ReactNode } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/shadcn/collapsible';

type MenuSectionProps = {
    /** MenuItem elements or nested MenuSubSection groups. */
    children?: ReactNode;
    /** Hides the section heading; visible by default. */
    isHeaderHidden?: boolean;
    /** Section heading displayed in the navigation. */
    title: string;
};

type MenuItemProps = {
    /** Content mounted beside the navigation while this item is selected. */
    children?: ReactNode;
    /** Optional LongLink icon name displayed beside the label. */
    icon?: StoneIconName;
    /** Navigation label; its lowercase, hyphenated form identifies the item's URL fragment. */
    label: string;
};

type MenuEntry =
    | { kind: 'item'; item: ReactElement<MenuItemProps> }
    | { kind: 'subsection'; group: ReactElement<MenuItemProps>; items: ReactElement<MenuItemProps>[] };

/** Derives each item's navigation fragment from its label. */
function menuItemId(item: ReactElement<MenuItemProps>): string {
    return item.props.label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Identifies a content-owning MenuItem without rendering its children. */
function isMenuItem(child: ReactNode): child is ReactElement<MenuItemProps> {
    return isValidElement(child) && child.type === MenuItem;
}

/** Renders section navigation beside content, or above it at View widths of 768px and below. */
export function Menu({
    children,
    gap = 3,
}: {
    /** MenuSection elements defining navigation and content. */
    children?: ReactNode;
    gap?: Spacing;
}) {
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

    // Resolve selectable items in navigation order.
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) => (entry.kind === 'subsection' ? entry.items : [entry.item]))
    );

    // Preserve first-item fallback when no item matches the current fragment.
    const activeItem = items.find((item) => `#${menuItemId(item)}` === hash) ?? items[0];

    /** Renders direct and nested items with the same navigation and selection behavior. */
    function renderItem(item: ReactElement<MenuItemProps>) {
        const id = menuItemId(item);

        // Preserve normal link semantics while routing ordinary clicks through the runtime API.
        return (
            <a
                className="view-section-nav-link"
                href={`#${id}`}
                aria-current={item === activeItem ? 'page' : undefined}
                key={id}
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
            >
                {item.props.icon && <Icon icon={item.props.icon} size="sm" />}
                <span className="view-section-nav-label">{item.props.label}</span>
            </a>
        );
    }

    // CSS changes the rail's position without remounting its disclosures or the active content.
    return (
        <div className="view-section-menu">
            <nav className="view-section-nav" aria-label="Settings navigation">
                {sections.map(({ entries, section }) => (
                    <div
                        role="group"
                        aria-label={section.props.title}
                        className="view-section-nav-section"
                        key={section.props.title}
                    >
                        <div className={`view-section-nav-heading${section.props.isHeaderHidden ? ' sr-only' : ''}`}>
                            {section.props.title}
                        </div>
                        <div className="view-section-nav-items">
                            {entries.map((entry) => {
                                if (entry.kind === 'subsection') {
                                    const { icon, label } = entry.group.props;

                                    return (
                                        <Collapsible defaultOpen={false} key={label}>
                                            <CollapsibleTrigger type="button" className="view-section-nav-link">
                                                {icon && <Icon icon={icon} size="sm" />}
                                                <span className="view-section-nav-label">{label}</span>
                                                <ChevronDown className="view-section-nav-chevron" aria-hidden="true" />
                                            </CollapsibleTrigger>
                                            <CollapsibleContent
                                                keepMounted
                                                role="group"
                                                aria-label={label}
                                                className="view-section-nav-nested"
                                            >
                                                {entry.items.map(renderItem)}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    );
                                }

                                return renderItem(entry.item);
                            })}
                        </div>
                    </div>
                ))}
            </nav>
            <div className="view-section-menu-content" style={{ gap: spacing(gap) }}>
                {activeItem?.props.children}
            </div>
        </div>
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
export function MenuSubSection(_props: {
    /** MenuItem elements nested inside this collapsible group. */
    children?: ReactNode;
    /** Optional LongLink icon name displayed beside the group label. */
    icon?: StoneIconName;
    /** Label displayed on the collapsible navigation group. */
    label: string;
}) {
    return null;
}
