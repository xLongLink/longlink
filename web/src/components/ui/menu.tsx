import { cva } from 'class-variance-authority';
import { ChevronDownIcon, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type MenuContextValue = {
    activeValue?: string;
    onValueChange: (value: string) => void;
};

type MenuProps = {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    ariaLabel?: string;
    children?: React.ReactNode;
};

type MenuListProps = {
    className?: string;
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

type MenuContentProps = {
    value: string;
    className?: string;
    children?: React.ReactNode;
};

type ResolvedMenuSubSection = {
    value: string;
    label: string;
    disabled?: boolean;
};

type ResolvedMenuSection = {
    value: string;
    label: string;
    icon?: LucideIcon;
    disabled?: boolean;
    subSections: ResolvedMenuSubSection[];
};

const MenuContext = React.createContext<MenuContextValue | null>(null);

const menuItemVariants = cva(
    'group/menu-item focus-visible:ring-ring/50 relative inline-flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            active: {
                true: 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgba(255,255,255,0.75)]',
                false: 'text-white/70 hover:bg-white/5 hover:text-white',
            },
            level: {
                root: '',
                sub: 'gap-2 px-2.5 py-1.5 text-[0.9375rem] font-medium',
            },
        },
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

/** Returns a text label when the child content is a plain string. */
function readText(children?: React.ReactNode): string | undefined {
    return typeof children === 'string' ? children : undefined;
}

/** Parses root menu sections and nested subsections from list children. */
function parseMenuSections(listChildren?: React.ReactNode): ResolvedMenuSection[] {
    const sectionNodes = React.Children.toArray(listChildren).filter(
        (child): child is React.ReactElement<MenuSectionProps> => React.isValidElement(child) && 'value' in child.props
    );

    return sectionNodes.map((sectionNode) => {
        const subSectionNodes = React.Children.toArray(sectionNode.props.children).filter(
            (child): child is React.ReactElement<MenuSubSectionProps> => React.isValidElement(child) && 'value' in child.props
        );

        return {
            value: sectionNode.props.value,
            label:
                sectionNode.props.label ??
                readText(sectionNode.props.children) ??
                prettifyValue(sectionNode.props.value),
            icon: sectionNode.props.icon,
            disabled: sectionNode.props.disabled,
            subSections: subSectionNodes.map((subSectionNode) => ({
                value: subSectionNode.props.value,
                label:
                    subSectionNode.props.label ??
                    readText(subSectionNode.props.children) ??
                    prettifyValue(subSectionNode.props.value),
                disabled: subSectionNode.props.disabled,
            })),
        };
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

export function MenuSection(_props: MenuSectionProps) {
    return null;
}


export function MenuSubSection(_props: MenuSubSectionProps) {
    return null;
}


export function MenuList({ className, children }: MenuListProps) {
    const menuContext = React.useContext(MenuContext);

    if (!menuContext) {
        throw new Error('MenuList must be used within a Menu component.');
    }

    const sections = React.useMemo(() => parseMenuSections(children), [children]);
    const { activeValue, onValueChange } = menuContext;

    const [expandedSectionIds, setExpandedSectionIds] = React.useState<Set<string>>(() => {
        const activeSection = sections.find(
            (section) =>
                section.value === activeValue || section.subSections.some((subSection) => subSection.value === activeValue)
        );

        return activeSection ? new Set([activeSection.value]) : new Set();
    });

    React.useEffect(() => {
        if (!sections.length) {
            return;
        }

        const activeSection = sections.find(
            (section) =>
                section.value === activeValue || section.subSections.some((subSection) => subSection.value === activeValue)
        );

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
        <nav className={cn('space-y-3', className)} aria-label="Section menu" onKeyDown={onKeyDown}>
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
                                className={cn(menuItemVariants({ active: sectionIsActive }))}
                                onClick={() => {
                                    onValueChange(section.value);
                                    if (hasSubSections) {
                                        toggleExpanded(section.value, { preserveIfExpanded: !sectionIsActive });
                                    }
                                }}
                            >
                                {SectionIcon ? (
                                    <SectionIcon
                                        className="size-4 text-white/70 group-data-[state=active]/menu-item:text-white"
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
                                    className="ml-3 space-y-1 border-l border-white/10 pl-2"
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
                                                    className={cn(
                                                        menuItemVariants({
                                                            active: subSectionIsActive,
                                                            level: 'sub',
                                                        })
                                                    )}
                                                    onClick={() => onValueChange(subSection.value)}
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
    );
}


export function MenuContent({ value, className, children }: MenuContentProps) {
    const menuContext = React.useContext(MenuContext);

    if (!menuContext) {
        throw new Error('MenuContent must be used within a Menu component.');
    }

    if (menuContext.activeValue !== value) {
        return null;
    }

    return <section className={className}>{children}</section>;
}


export function Menu({
    value,
    defaultValue,
    onValueChange,
    className,
    ariaLabel = 'Section menu',
    children,
}: MenuProps) {
    const menuList = React.Children.toArray(children).find(
        (child): child is React.ReactElement<MenuListProps> => React.isValidElement(child) && child.type === MenuList
    );

    const sections = React.useMemo(() => parseMenuSections(menuList?.props.children), [menuList?.props.children]);

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue ?? getInitialValue(sections));

    const activeValue = isControlled ? value : internalValue;

    React.useEffect(() => {
        if (isControlled) {
            return;
        }

        if (!internalValue) {
            setInternalValue(getInitialValue(sections));
            return;
        }

        const hasValue = sections.some(
            (section) =>
                section.value === internalValue || section.subSections.some((subSection) => subSection.value === internalValue)
        );

        if (!hasValue) {
            setInternalValue(getInitialValue(sections));
        }
    }, [internalValue, isControlled, sections]);

    /** Commits the next active value. */
    function commitValue(nextValue: string) {
        if (!isControlled) {
            setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
    }

    return (
        <MenuContext.Provider
            value={{
                activeValue,
                onValueChange: commitValue,
            }}
        >
            <div className={cn('grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]', className)} aria-label={ariaLabel}>
                {children}
            </div>
        </MenuContext.Provider>
    );
}

export type { MenuContentProps, MenuListProps, MenuProps, MenuSectionProps, MenuSubSectionProps };
