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

import {
    Menu as BaseMenu,
    MenuContent,
    MenuList,
    MenuSection as BaseMenuSection,
    MenuSubSection as BaseMenuSubSection,
} from '@/components/ui/menu';

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
    rootSubSection?: NormalizedSubSection;
    subSections: NormalizedSubSection[];
};

function getDefaultActiveValue(
    sections: NormalizedSection[]
): string | undefined {
    const firstSection = sections[0];

    if (!firstSection) {
        return undefined;
    }

    if (firstSection.rootSubSection) {
        return firstSection.id;
    }

    return firstSection.subSections[0]?.id ?? firstSection.id;
}

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
            rootSubSection,
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
    const [activeValue, setActiveValue] = useState<string | undefined>(() =>
        getDefaultActiveValue(sections)
    );

    useEffect(() => {
        if (!sections.length) {
            setActiveValue(undefined);
            return;
        }

        const hasActiveValue = sections.some(
            (section) =>
                section.id === activeValue ||
                section.subSections.some(
                    (subSection) => subSection.id === activeValue
                )
        );

        if (!hasActiveValue) {
            setActiveValue(getDefaultActiveValue(sections));
        }
    }, [activeValue, sections]);

    if (!sections.length) {
        return null;
    }

    return (
        <BaseMenu
            value={activeValue}
            onValueChange={setActiveValue}
            ariaLabel="ViaVai menu"
        >
            <aside className="w-64">
                <MenuList>
                    {sections.map((section) => (
                        <BaseMenuSection
                            key={section.id}
                            value={section.id}
                            label={section.title}
                            icon={section.icon}
                        >
                            {section.subSections.map((subSection) => (
                                <BaseMenuSubSection
                                    key={subSection.id}
                                    value={subSection.id}
                                    label={subSection.title}
                                />
                            ))}
                        </BaseMenuSection>
                    ))}
                </MenuList>
            </aside>

            <div className="space-y-3">
                {sections.map((section) => (
                    <div key={`${section.id}-content`}>
                        {section.rootSubSection ? (
                            <MenuContent value={section.id}>
                                {section.rootSubSection.children}
                            </MenuContent>
                        ) : null}

                        {section.subSections.map((subSection) => (
                            <MenuContent
                                key={subSection.id}
                                value={subSection.id}
                            >
                                {subSection.children}
                            </MenuContent>
                        ))}
                    </div>
                ))}
            </div>
        </BaseMenu>
    );
}

export default Menu;
