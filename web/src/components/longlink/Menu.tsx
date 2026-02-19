import {
    Children,
    isValidElement,
    lazy,
    useEffect,
    useMemo,
    useState,
    type ReactElement,
    type LazyExoticComponent,
    type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppWindow } from 'lucide-react';

// import { getIconByName } from '@/components/Icon';

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
    title: string;
    icon?: string | null;
    children?: ReactNode;
};

type MenuSubSectionProps = {
    title: string;
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

type IconModule = {
    default: LucideIcon;
};

const iconImporters = import.meta.glob<IconModule>(
    '/node_modules/lucide-react/dist/esm/icons/*.js'
);
const lazyIcons: Record<string, LazyExoticComponent<LucideIcon>> = {};

for (const path in iconImporters) {
    const match = path.match(/icons\/(.*)\.js$/);

    if (!match) {
        continue;
    }

    lazyIcons[match[1]] = lazy(iconImporters[path]);
}

function flattenParsedProps<T extends { props?: T }>(props: T): T {
    if (!props.props) {
        return props;
    }

    return {
        ...props.props,
        ...props,
        props: undefined,
    };
}

function resolveSectionIcon(props: ParsedMenuSectionProps): LucideIcon {
    const sectionProps = flattenParsedProps(props);
    const iconName = sectionProps.icon;

    if (!iconName) {
        return AppWindow;
    }

    return (lazyIcons[iconName] ?? AppWindow) as LucideIcon;
}

function resolveSubSectionIsRoot(props: ParsedMenuSubSectionProps): boolean {
    return flattenParsedProps(props).root ?? false;
}

function normalizeSections(children?: ReactNode): NormalizedSection[] {
    const sections = Children.toArray(children).filter(
        (child) => isValidElement(child) && child.type === MenuSection
    ) as ReactElement<ParsedMenuSectionProps>[];

    return sections.map((section, sectionIndex) => {
        const sectionProps = flattenParsedProps(section.props);
        const sectionChildren = Children.toArray(sectionProps.children).filter(
            (child) => isValidElement(child) && child.type === MenuSubSection
        ) as ReactElement<ParsedMenuSubSectionProps>[];

        const normalizedSubSections = sectionChildren.map(
            (subSection, subIndex) => {
                const subSectionProps = flattenParsedProps(subSection.props);

                return {
                    id: `section-${sectionIndex}-sub-${subIndex}`,
                    title: subSectionProps.title,
                    isRoot: resolveSubSectionIsRoot(subSection.props),
                    children: subSectionProps.children,
                };
            }
        );

        const rootSubSection = normalizedSubSections.find(
            (subSection) => subSection.isRoot
        );

        return {
            id: `section-${sectionIndex}`,
            title: sectionProps.title,
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
    const [activeValue, setActiveValue] = useState<string | undefined>(() => {
        const firstSection = sections[0];

        if (!firstSection) {
            return undefined;
        }

        return firstSection.rootSubSection
            ? firstSection.id
            : (firstSection.subSections[0]?.id ?? firstSection.id);
    });

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
            const firstSection = sections[0];

            if (!firstSection) {
                setActiveValue(undefined);
                return;
            }

            setActiveValue(
                firstSection.rootSubSection
                    ? firstSection.id
                    : (firstSection.subSections[0]?.id ?? firstSection.id)
            );
        }
    }, [activeValue, sections]);

    if (!sections.length) {
        return null;
    }

    return (
        <BaseMenu
            value={activeValue}
            onValueChange={setActiveValue}
            ariaLabel="Longlink menu"
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
