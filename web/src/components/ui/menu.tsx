import * as React from 'react';
import { cva } from 'class-variance-authority';
import { ChevronDownIcon, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type MenuSubSection = {
    id: string;
    label: string;
    icon?: LucideIcon;
    disabled?: boolean;
};

type MenuSection = {
    id: string;
    label: string;
    icon?: LucideIcon;
    disabled?: boolean;
    subSections?: MenuSubSection[];
};

type MenuProps = {
    sections: MenuSection[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    ariaLabel?: string;
};

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

function getInitialValue(sections: MenuSection[]): string | undefined {
    const firstSection = sections.find((section) => !section.disabled);
    if (!firstSection) {
        return undefined;
    }

    const firstSubSection = firstSection.subSections?.find(
        (subSection) => !subSection.disabled
    );

    return firstSubSection?.id ?? firstSection.id;
}

export function Menu({
    sections,
    value,
    defaultValue,
    onValueChange,
    className,
    ariaLabel = 'Section menu',
}: MenuProps) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<
        string | undefined
    >(defaultValue ?? getInitialValue(sections));

    const activeValue = isControlled ? value : internalValue;

    const [expandedSectionIds, setExpandedSectionIds] = React.useState<
        Set<string>
    >(() => {
        const activeSection = sections.find(
            (section) =>
                section.id === activeValue ||
                section.subSections?.some(
                    (subSection) => subSection.id === activeValue
                )
        );

        return activeSection ? new Set([activeSection.id]) : new Set();
    });

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
                section.id === internalValue ||
                section.subSections?.some(
                    (subSection) => subSection.id === internalValue
                )
        );

        if (!hasValue) {
            setInternalValue(getInitialValue(sections));
        }
    }, [internalValue, isControlled, sections]);

    React.useEffect(() => {
        const activeSection = sections.find(
            (section) =>
                section.id === activeValue ||
                section.subSections?.some(
                    (subSection) => subSection.id === activeValue
                )
        );

        if (!activeSection) {
            return;
        }

        if (!activeSection.subSections?.length) {
            return;
        }

        setExpandedSectionIds((previous) => {
            if (previous.has(activeSection.id)) {
                return previous;
            }

            const next = new Set(previous);
            next.add(activeSection.id);
            return next;
        });
    }, [activeValue, sections]);

    const commitValue = React.useCallback(
        (nextValue: string) => {
            if (!isControlled) {
                setInternalValue(nextValue);
            }
            onValueChange?.(nextValue);
        },
        [isControlled, onValueChange]
    );

    const toggleExpanded = React.useCallback((sectionId: string) => {
        setExpandedSectionIds((previous) => {
            const next = new Set(previous);

            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }

            return next;
        });
    }, []);

    const onKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLElement>) => {
            const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                    '[data-menu-item="true"]:not([disabled])'
                )
            );

            if (!items.length) {
                return;
            }

            const activeElement = document.activeElement as HTMLElement | null;
            const currentIndex = activeElement
                ? items.findIndex((item) => item === activeElement)
                : -1;

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
        },
        []
    );

    return (
        <nav
            data-slot="menu"
            aria-label={ariaLabel}
            className={cn('w-full', className)}
            onKeyDown={onKeyDown}
        >
            <ul className="space-y-1" role="list">
                {sections.map((section) => {
                    const hasSubSections = Boolean(section.subSections?.length);
                    const isExpanded = expandedSectionIds.has(section.id);
                    const sectionIsActive = activeValue === section.id;
                    const SectionIcon = section.icon;

                    return (
                        <li key={section.id} className="space-y-1">
                            <div className="relative">
                                <button
                                    type="button"
                                    data-menu-item="true"
                                    data-state={
                                        sectionIsActive ? 'active' : 'inactive'
                                    }
                                    data-expanded={isExpanded}
                                    aria-expanded={
                                        hasSubSections ? isExpanded : undefined
                                    }
                                    aria-current={
                                        activeValue === section.id
                                            ? 'page'
                                            : undefined
                                    }
                                    disabled={section.disabled}
                                    className={cn(
                                        menuItemVariants({
                                            active: sectionIsActive,
                                        })
                                    )}
                                    onClick={() => {
                                        commitValue(section.id);
                                        if (hasSubSections) {
                                            toggleExpanded(section.id);
                                        }
                                    }}
                                >
                                    {SectionIcon ? (
                                        <SectionIcon
                                            className="size-4 text-white/70 group-data-[state=active]/menu-item:text-white"
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    <span className="truncate">
                                        {section.label}
                                    </span>
                                    {hasSubSections ? (
                                        <ChevronDownIcon
                                            aria-hidden="true"
                                            className="ml-auto size-4 transition-transform data-[expanded=true]:rotate-180"
                                            data-expanded={isExpanded}
                                        />
                                    ) : null}
                                </button>
                            </div>

                            {hasSubSections && isExpanded ? (
                                <ul
                                    className="ml-3 space-y-1 border-l border-white/10 pl-2"
                                    role="list"
                                    aria-label={`${section.label} sub-sections`}
                                >
                                    {section.subSections?.map((subSection) => {
                                        const subSectionIsActive =
                                            activeValue === subSection.id;
                                        return (
                                            <li
                                                key={subSection.id}
                                                className="relative"
                                            >
                                                <button
                                                    type="button"
                                                    data-menu-item="true"
                                                    data-state={
                                                        subSectionIsActive
                                                            ? 'active'
                                                            : 'inactive'
                                                    }
                                                    aria-current={
                                                        subSectionIsActive
                                                            ? 'page'
                                                            : undefined
                                                    }
                                                    disabled={
                                                        subSection.disabled
                                                    }
                                                    className={cn(
                                                        menuItemVariants({
                                                            active: subSectionIsActive,
                                                            level: 'sub',
                                                        })
                                                    )}
                                                    onClick={() =>
                                                        commitValue(
                                                            subSection.id
                                                        )
                                                    }
                                                >
                                                    <span className="truncate">
                                                        {subSection.label}
                                                    </span>
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

export type { MenuProps, MenuSection, MenuSubSection };
