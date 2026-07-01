import { cva } from 'class-variance-authority';
import { ChevronDownIcon, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type MenuProps = {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    hashNavigation?: boolean;
    className?: string;
    ariaLabel?: string;
    children?: React.ReactNode;
};

type MenuSectionProps = {
    value: string;
    label?: string;
    icon?: LucideIcon;
    disabled?: boolean;
    children?: React.ReactNode;
};

type MenuSubSectionProps = {
    value: string;
    label?: string;
    disabled?: boolean;
    children?: React.ReactNode;
};

type ResolvedMenuSubSection = {
    value: string;
    label: string;
    disabled?: boolean;
    content: React.ReactNode[];
};

type ResolvedMenuSection = {
    value: string;
    label: string;
    icon?: LucideIcon;
    disabled?: boolean;
    content: React.ReactNode[];
    subSections: ResolvedMenuSubSection[];
};

const menuItemVariants = cva(
    'group/menu-item focus-visible:ring-ring/50 relative inline-flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            active: {
                true: 'bg-accent/10 text-foreground',
                false: 'text-muted-foreground hover:bg-accent/5 hover:text-foreground',
            },
            level: {
                root: '',
                sub: 'gap-1 rounded-md px-2 py-1 text-xs font-normal',
            },
        },
        compoundVariants: [
            {
                active: true,
                level: 'root',
                className: 'border-l-4 border-l-accent',
            },
            {
                active: false,
                level: 'root',
                className: 'border-l-4 border-l-border',
            },
            {
                active: true,
                level: 'sub',
                className: 'border-l-4 border-l-accent',
            },
            {
                active: false,
                level: 'sub',
                className: 'border-l-0',
            },
        ],
        defaultVariants: {
            active: false,
            level: 'root',
        },
    }
);

/** Formats a fallback label from a value. */
function prettifyValue(value: string): string {
    return value
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Returns whether a child is a menu section marker. */
function isMenuSectionElement(child: React.ReactNode): child is React.ReactElement<MenuSectionProps> {
    return React.isValidElement<MenuSectionProps>(child) && child.type === MenuSection;
}

/** Returns whether a child is a menu subsection marker. */
function isMenuSubSectionElement(child: React.ReactNode): child is React.ReactElement<MenuSubSectionProps> {
    return React.isValidElement<MenuSubSectionProps>(child) && child.type === MenuSubSection;
}

/** Parses nested menu sections and subsection content from children. */
function parseMenuSections(children?: React.ReactNode): ResolvedMenuSection[] {
    return React.Children.toArray(children).flatMap((child) => {
        if (!isMenuSectionElement(child)) {
            return [];
        }

        const sectionChildren = React.Children.toArray(child.props.children);
        const content = sectionChildren.filter((sectionChild) => !isMenuSubSectionElement(sectionChild));

        return [
            {
                value: child.props.value,
                label: child.props.label ?? prettifyValue(child.props.value),
                icon: child.props.icon,
                disabled: child.props.disabled,
                content,
                subSections: sectionChildren.filter(isMenuSubSectionElement).map((subSectionNode) => ({
                    value: subSectionNode.props.value,
                    label: subSectionNode.props.label ?? prettifyValue(subSectionNode.props.value),
                    disabled: subSectionNode.props.disabled,
                    content: React.Children.toArray(subSectionNode.props.children),
                })),
            },
        ];
    });
}

/** Resolves the first enabled root or nested item. */
function getInitialValue(sections: ResolvedMenuSection[]): string | undefined {
    const firstSection = sections.find((section) => !section.disabled);

    if (!firstSection) {
        return undefined;
    }

    const firstSubSection = firstSection.subSections.find((subSection) => !subSection.disabled);

    return firstSubSection?.value ?? firstSection.value;
}


/** Reads the current browser hash without the leading marker. */
function getCurrentHashValue(): string | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    const hash = window.location.hash.replace(/^#/, '');

    if (!hash) {
        return undefined;
    }

    try {
        return decodeURIComponent(hash);
    } catch {
        return hash;
    }
}


/** Returns a selectable section or subsection value matching the candidate. */
function getSelectableMenuValue(sections: ResolvedMenuSection[], candidate?: string): string | undefined {
    if (!candidate) {
        return undefined;
    }

    for (const section of sections) {
        if (section.value === candidate) {
            return section.disabled ? undefined : section.value;
        }

        const subSection = section.subSections.find((item) => item.value === candidate);

        if (subSection) {
            return section.disabled || subSection.disabled ? undefined : subSection.value;
        }
    }

    return undefined;
}


/** Resolves the initial active value, preferring a valid URL hash when enabled. */
function getInitialActiveValue(
    sections: ResolvedMenuSection[],
    defaultValue: string | undefined,
    hashNavigation: boolean
): string | undefined {
    const hashValue = hashNavigation ? getSelectableMenuValue(sections, getCurrentHashValue()) : undefined;

    return hashValue ?? getSelectableMenuValue(sections, defaultValue) ?? getInitialValue(sections);
}


/** Replaces the current browser hash without adding a history entry. */
function replaceLocationHash(value: string) {
    if (typeof window === 'undefined') {
        return;
    }

    const nextHash = `#${encodeURIComponent(value)}`;

    if (window.location.hash === nextHash) {
        return;
    }

    window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}${nextHash}`
    );
}


/** Finds the section that owns the active value. */
function findActiveSection(sections: ResolvedMenuSection[], value: string): ResolvedMenuSection | undefined {
    return sections.find(
        (section) => section.value === value || section.subSections.some((subSection) => subSection.value === value)
    );
}

/** Resolves the content nodes for the current active value. */
function getActiveContent(sections: ResolvedMenuSection[], value: string): React.ReactNode[] {
    const activeSection = findActiveSection(sections, value);

    if (!activeSection) {
        return [];
    }

    if (activeSection.value === value) {
        return activeSection.content;
    }

    const activeSubSection = activeSection.subSections.find((subSection) => subSection.value === value);

    return activeSubSection?.content ?? [];
}

/** Marks a top-level menu section. */
export function MenuSection(_props: MenuSectionProps) {
    return null;
}

/** Marks a nested menu subsection. */
export function MenuSubSection(_props: MenuSubSectionProps) {
    return null;
}

/** Renders the menu shell with sidebar navigation and active content. */
export function Menu({
    value,
    defaultValue,
    onValueChange,
    hashNavigation = false,
    className,
    ariaLabel = 'Section menu',
    children,
}: MenuProps) {
    const sections = React.useMemo(() => parseMenuSections(children), [children]);

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<string | undefined>(() =>
        getInitialActiveValue(sections, defaultValue, hashNavigation)
    );

    const activeValue = isControlled ? value : internalValue;

    const activeContent = activeValue ? getActiveContent(sections, activeValue) : [];

    const [expandedSectionIds, setExpandedSectionIds] = React.useState<Set<string>>(() => {
        if (!activeValue) {
            return new Set();
        }

        const activeSection = findActiveSection(sections, activeValue);

        return activeSection && activeSection.subSections.length ? new Set([activeSection.value]) : new Set();
    });

    React.useEffect(() => {
        if (isControlled) {
            return;
        }

        if (!internalValue) {
            setInternalValue(getInitialActiveValue(sections, defaultValue, hashNavigation));
            return;
        }

        if (!getSelectableMenuValue(sections, internalValue)) {
            setInternalValue(getInitialActiveValue(sections, defaultValue, hashNavigation));
        }
    }, [defaultValue, hashNavigation, internalValue, isControlled, sections]);

    React.useEffect(() => {
        if (!hashNavigation || typeof window === 'undefined') {
            return;
        }

        /** Selects the hashed menu item or writes the active value to the URL. */
        function syncValueFromHash() {
            const nextValue = getSelectableMenuValue(sections, getCurrentHashValue());

            if (nextValue) {
                if (nextValue === activeValue) {
                    return;
                }

                if (!isControlled) {
                    setInternalValue(nextValue);
                }

                onValueChange?.(nextValue);
                return;
            }

            if (activeValue) {
                replaceLocationHash(activeValue);
            }
        }

        syncValueFromHash();
        window.addEventListener('hashchange', syncValueFromHash);

        return () => window.removeEventListener('hashchange', syncValueFromHash);
    }, [activeValue, hashNavigation, isControlled, onValueChange, sections]);

    React.useEffect(() => {
        if (!activeValue) {
            return;
        }

        const activeSection = findActiveSection(sections, activeValue);

        if (!activeSection || !activeSection.subSections.length) {
            return;
        }

        setExpandedSectionIds((previous) => {
            if (previous.has(activeSection.value)) {
                return previous;
            }

            const next = new Set(previous);
            next.add(activeSection.value);
            return next;
        });
    }, [activeValue, sections]);

    /** Commits the next active value. */
    function commitValue(nextValue: string) {
        if (!isControlled) {
            setInternalValue(nextValue);
        }

        if (hashNavigation) {
            replaceLocationHash(nextValue);
        }

        onValueChange?.(nextValue);
    }

    /** Moves focus through rendered menu items. */
    function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
        const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('[data-menu-item="true"]:not([disabled])')
        );

        if (!items.length) {
            return;
        }

        const activeElement = document.activeElement as HTMLElement | null;
        const currentIndex = activeElement ? items.findIndex((item) => item === activeElement) : -1;

        const moveTo = (index: number) => {
            const target = items.at(index);

            target?.focus();
        };

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveTo(Math.min(currentIndex + 1, items.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveTo(Math.max(currentIndex - 1, 0));
        } else if (event.key === 'Home') {
            event.preventDefault();
            moveTo(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            moveTo(items.length - 1);
        }
    }

    /** Toggles expanded state for a root section. */
    function toggleExpanded(sectionValue: string, options: { preserveIfExpanded?: boolean } = {}) {
        setExpandedSectionIds((previous) => {
            if (options.preserveIfExpanded && previous.has(sectionValue)) {
                return previous;
            }

            const next = new Set(previous);

            if (next.has(sectionValue)) {
                next.delete(sectionValue);
            } else {
                next.add(sectionValue);
            }

            return next;
        });
    }

    return (
        <div className={cn('grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]', className)} aria-label={ariaLabel}>
            <nav className="space-y-3" aria-label={ariaLabel} onKeyDown={onKeyDown}>
                <ul className="space-y-2" role="list">
                    {sections.map((section) => {
                        const hasSubSections = section.subSections.length > 0;
                        const sectionIsActive = activeValue === section.value;
                        const isExpanded = expandedSectionIds.has(section.value);
                        const SectionIcon = section.icon;

                        return (
                            <li key={section.value} className="space-y-1">
                                <button
                                    type="button"
                                    data-menu-item="true"
                                    data-state={sectionIsActive ? 'active' : 'inactive'}
                                    data-expanded={isExpanded}
                                    aria-expanded={hasSubSections ? isExpanded : undefined}
                                    aria-current={sectionIsActive ? 'page' : undefined}
                                    disabled={section.disabled}
                                    className={menuItemVariants({ active: sectionIsActive })}
                                    onClick={() => {
                                        commitValue(section.value);

                                        if (hasSubSections) {
                                            toggleExpanded(section.value, { preserveIfExpanded: !sectionIsActive });
                                        }
                                    }}
                                >
                                    {SectionIcon ? (
                                        <SectionIcon
                                            className="size-4 text-muted-foreground group-data-[state=active]/menu-item:text-foreground"
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    <span className="truncate">{section.label}</span>
                                    {hasSubSections ? (
                                        <ChevronDownIcon
                                            aria-hidden="true"
                                            className="ml-auto size-4 transition-transform data-[expanded=true]:rotate-180"
                                            data-expanded={isExpanded}
                                        />
                                    ) : null}
                                </button>

                                {hasSubSections && isExpanded ? (
                                    <ul
                                        className="ml-3 space-y-1 border-l border-border pl-2"
                                        role="list"
                                        aria-label={`${section.label} sub-sections`}
                                    >
                                        {section.subSections.map((subSection) => {
                                            const subSectionIsActive = activeValue === subSection.value;

                                            return (
                                                <li key={subSection.value} className="relative">
                                                    <button
                                                        type="button"
                                                        data-menu-item="true"
                                                        data-state={subSectionIsActive ? 'active' : 'inactive'}
                                                        aria-current={subSectionIsActive ? 'page' : undefined}
                                                        disabled={subSection.disabled}
                                                        className={menuItemVariants({
                                                            active: subSectionIsActive,
                                                            level: 'sub',
                                                        })}
                                                        onClick={() => commitValue(subSection.value)}
                                                    >
                                                        <span className="truncate">{subSection.label}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <section id={hashNavigation ? activeValue : undefined} className="min-w-0 space-y-4">
                {activeContent}
            </section>
        </div>
    );
}

export type { MenuProps, MenuSectionProps, MenuSubSectionProps };
