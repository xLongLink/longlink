import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { useContext, type ReactNode } from 'react';
import type { IconName } from 'lucide-react/dynamic';
import { Icon } from '@/components/longlink/display/icon';
import { Button, buttonVariants } from '@/components/shadcn/button';
import { MenuNavigationContext } from '@/components/custom/contexts';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/shadcn/collapsible';

type MenuSection = {
    entries: readonly MenuEntry[];
    /** Hides the section heading; visible by default. */
    isHeaderHidden?: boolean;
    /** Section heading displayed in the navigation. */
    title: string;
};

type MenuItem = {
    /** Content mounted beside the navigation while this item is selected. */
    content?: ReactNode;
    /** Optional Lucide icon name displayed beside the label. */
    icon?: IconName;
    /** Navigation label; its lowercase, hyphenated form identifies the item's URL fragment. */
    label: string;
};

type MenuEntry =
    | (MenuItem & { kind: 'item' })
    | { kind: 'subsection'; label: string; icon?: IconName; items: readonly MenuItem[] };

/** Derives each item's navigation fragment from its label. */
function menuItemId(item: MenuItem): string {
    return item.label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Renders section navigation beside content, or above it at View widths of 768px and below. */
export function Menu({
    sections,
    gap
}: {
    /** Sections defining navigation and selected content. */
    sections: readonly MenuSection[];
    gap?: number;
}) {
    const navigation = useContext(MenuNavigationContext);

    // Require the runtime-owned navigation API, not a React Router provider.
    if (navigation === null) throw new Error('Menu requires MenuNavigationContext');
    const { hash, select } = navigation;

    // Resolve selectable items in navigation order.
    const items = sections.flatMap(({ entries }) =>
        entries.flatMap((entry) => (entry.kind === 'subsection' ? entry.items : [entry]))
    );

    // Preserve first-item fallback when no item matches the current fragment.
    const activeItem = items.find((item) => `#${menuItemId(item)}` === hash) ?? items[0];

    /** Renders direct and nested items with the same navigation and selection behavior. */
    function renderItem(item: MenuItem) {
        const id = menuItemId(item);

        // Preserve normal link semantics while routing ordinary clicks through the runtime API.
        return (
            <a
                className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'w-full justify-start text-start aria-[current=page]:bg-muted'
                )}
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
                {item.icon && <Icon icon={item.icon} size="sm" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </a>
        );
    }

    // CSS changes the rail's position without remounting its disclosures or the active content.
    return (
        <div
            className="grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start gap-3 max-[768px]:grid-cols-[minmax(0,1fr)]"
            style={{ gap: gap === undefined ? undefined : `calc(var(--spacing) * ${gap})` }}
        >
            <nav
                className="box-border min-w-0 bg-inherit ps-2 pe-6 pb-2 font-sans max-[768px]:pe-2"
                aria-label="Settings navigation"
            >
                {sections.map(({ entries, title, isHeaderHidden }) => (
                    <div role="group" aria-label={title} className="-mx-2 pb-1" key={title}>
                        <div
                            className={cn(
                                'truncate pb-1 pe-2 text-xs font-medium text-muted-foreground',
                                isHeaderHidden && 'sr-only'
                            )}
                        >
                            {title}
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                            {entries.map((entry) => {
                                if (entry.kind === 'subsection') {
                                    const { icon, label } = entry;

                                    return (
                                        <Collapsible defaultOpen={false} key={label}>
                                            <CollapsibleTrigger
                                                type="button"
                                                render={
                                                    <Button
                                                        variant="ghost"
                                                        className="group/section w-full justify-start text-start"
                                                    />
                                                }
                                            >
                                                {icon && <Icon icon={icon} size="sm" />}
                                                <span className="min-w-0 flex-1 truncate">{label}</span>
                                                <ChevronDown
                                                    className="size-4 shrink-0 group-aria-expanded/section:rotate-180"
                                                    aria-hidden="true"
                                                />
                                            </CollapsibleTrigger>
                                            <CollapsibleContent
                                                keepMounted
                                                role="group"
                                                aria-label={label}
                                                className="flex min-w-0 flex-col gap-0.5 ps-6"
                                            >
                                                {entry.items.map(renderItem)}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    );
                                }

                                return renderItem(entry);
                            })}
                        </div>
                    </div>
                ))}
            </nav>
            <div className="flex min-w-0 flex-col">{activeItem?.content}</div>
        </div>
    );
}
