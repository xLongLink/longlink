import {
    Children,
    isValidElement,
    useEffect,
    useMemo,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppWindow, Box, FolderKanban, Table2 } from 'lucide-react';

type MenuProps = {
    children?: ReactNode;
};

type MenuSectionProps = {
    title?: string;
    icon?: string | null;
    children?: ReactNode;
};

type MenuSubSectionProps = {
    title?: string;
    root?: boolean;
    children?: ReactNode;
};

type ParsedMenuSectionProps = MenuSectionProps & {
    props?: MenuSectionProps;
};

type ParsedMenuSubSectionProps = MenuSubSectionProps & {
    props?: MenuSubSectionProps;
};

type NormalizedSubSection = {
    id: string;
    title: string;
    isRoot: boolean;
    children?: ReactNode;
};

type NormalizedSection = {
    id: string;
    title: string;
    icon: LucideIcon;
    rootChildren?: ReactNode;
    subSections: NormalizedSubSection[];
};

const iconByName: Record<string, LucideIcon> = {
    table: Table2,
    tabs: FolderKanban,
};

function resolveSectionTitle(props: ParsedMenuSectionProps): string {
    return props.title ?? props.props?.title ?? 'Section';
}

function resolveSectionIcon(props: ParsedMenuSectionProps): LucideIcon {
    const iconName = props.icon ?? props.props?.icon;

    if (!iconName) {
        return AppWindow;
    }

    return iconByName[iconName] ?? Box;
}

function resolveSubSectionTitle(
    props: ParsedMenuSubSectionProps,
    fallback: string
): string {
    return props.title ?? props.props?.title ?? fallback;
}

function resolveSubSectionIsRoot(props: ParsedMenuSubSectionProps): boolean {
    return props.root ?? props.props?.root ?? false;
}

function normalizeSections(children?: ReactNode): NormalizedSection[] {
    const sections = Children.toArray(children).filter(
        (child) => isValidElement(child) && child.type === MenuSection
    ) as ReactElement<ParsedMenuSectionProps>[];

    return sections.map((section, sectionIndex) => {
        const sectionChildren = Children.toArray(section.props.children).filter(
            (child) => isValidElement(child) && child.type === MenuSubSection
        ) as ReactElement<ParsedMenuSubSectionProps>[];

        const normalizedSubSections = sectionChildren.map(
            (subSection, subIndex) => ({
                id: `section-${sectionIndex}-sub-${subIndex}`,
                title: resolveSubSectionTitle(
                    subSection.props,
                    subSection.props.root || subSection.props.props?.root
                        ? 'Overview'
                        : `Sub-section ${subIndex + 1}`
                ),
                isRoot: resolveSubSectionIsRoot(subSection.props),
                children: subSection.props.children,
            })
        );

        const rootSubSection = normalizedSubSections.find(
            (subSection) => subSection.isRoot
        );

        return {
            id: `section-${sectionIndex}`,
            title: resolveSectionTitle(section.props),
            icon: resolveSectionIcon(section.props),
            rootChildren: rootSubSection?.children,
            subSections: normalizedSubSections.filter(
                (subSection) => !subSection.isRoot
            ),
        };
    });
}

export function MenuSection({ children }: MenuSectionProps) {
    return <>{children}</>;
}

export function MenuSubSection({ children }: MenuSubSectionProps) {
    return <>{children}</>;
}

export function Menu({ children }: MenuProps) {
    const sections = useMemo(() => normalizeSections(children), [children]);

    const [activeSectionId, setActiveSectionId] = useState<string | null>(
        sections[0]?.id ?? null
    );

    const activeSection = useMemo(() => {
        return sections.find((section) => section.id === activeSectionId);
    }, [activeSectionId, sections]);

    const [activeSubSectionId, setActiveSubSectionId] = useState<string | null>(
        activeSection?.subSections[0]?.id ?? null
    );

    useEffect(() => {
        if (!sections.length) {
            setActiveSectionId(null);
            setActiveSubSectionId(null);
            return;
        }

        if (!sections.some((section) => section.id === activeSectionId)) {
            setActiveSectionId(sections[0].id);
        }
    }, [activeSectionId, sections]);

    useEffect(() => {
        const nextActiveSection = sections.find(
            (section) => section.id === activeSectionId
        );

        const hasSubSection = nextActiveSection?.subSections.some(
            (subSection) => subSection.id === activeSubSectionId
        );

        if (!hasSubSection) {
            setActiveSubSectionId(
                nextActiveSection?.subSections[0]?.id ?? null
            );
        }
    }, [activeSectionId, activeSubSectionId, sections]);

    if (!sections.length) {
        return null;
    }

    const activeSubSection = activeSection?.subSections.find(
        (subSection) => subSection.id === activeSubSectionId
    );

    return (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-3">
                {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection?.id === section.id;

                    return (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => setActiveSectionId(section.id)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                                isActive
                                    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgba(255,255,255,0.75)]'
                                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon
                                className={`h-4 w-4 ${
                                    isActive ? 'text-white' : 'text-white/70'
                                }`}
                            />
                            <span>{section.title}</span>
                        </button>
                    );
                })}
            </aside>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold">
                    {activeSection?.title}
                </h2>

                {activeSection?.subSections.length ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {activeSection.subSections.map((subSection) => {
                                const isSubActive =
                                    activeSubSection?.id === subSection.id;

                                return (
                                    <button
                                        key={subSection.id}
                                        type="button"
                                        onClick={() =>
                                            setActiveSubSectionId(subSection.id)
                                        }
                                        className={`rounded-md border px-3 py-1.5 text-sm transition ${
                                            isSubActive
                                                ? 'border-white/40 bg-white/10 text-white'
                                                : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
                                        }`}
                                    >
                                        {subSection.title}
                                    </button>
                                );
                            })}
                        </div>

                        {activeSubSection?.children}
                    </div>
                ) : (
                    activeSection?.rootChildren
                )}
            </section>
        </div>
    );
}

export default Menu;
