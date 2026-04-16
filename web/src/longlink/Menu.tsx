import { useMemo, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { AppWindow } from 'lucide-react';
import { renderNode, useRuntime } from 'reactxml';
import type { ASTNode } from 'reactxml';
import { Icon } from '@/longlink/Icon';

import {
    Menu as BaseMenu,
    MenuContent,
    MenuList,
    MenuSection as BaseMenuSection,
    MenuSubSection as BaseMenuSubSection,
} from '@/ui/menu';

type MenuProps = {
    children?: React.ReactNode;
};

type MenuSectionProps = {
    title: string;
    icon?: string | null;
    children?: React.ReactNode;
};

type MenuSubSectionProps = {
    title: string;
    root?: boolean;
    children?: React.ReactNode;
};

type NormalizedSubSection = {
    id: string;
    title: string;
    isRoot: boolean;
    node: ASTNode;
};

type NormalizedSection = {
    id: string;
    title: string;
    icon: LucideIcon;
    rootSubSection?: NormalizedSubSection;
    subSections: NormalizedSubSection[];
};

const MenuSectionIcon = ({ iconName, ...props }: { iconName: string } & LucideProps) => (
    <Icon name={iconName} fallback="app-window" {...props} />
);

function makeIcon(iconName: string | undefined): LucideIcon {
    if (!iconName) return AppWindow;

    const name = iconName;
    function ResolvedIcon(props: LucideProps) {
        return <MenuSectionIcon iconName={name} {...props} />;
    }
    return ResolvedIcon as LucideIcon;
}

function parseSectionsFromAST(menuNode: ASTNode): NormalizedSection[] {
    const sectionNodes = (menuNode.children ?? []).filter((n) => n.name === 'MenuSection');

    return sectionNodes.map((sectionNode, sectionIndex) => {
        const subSectionNodes = (sectionNode.children ?? []).filter((n) => n.name === 'MenuSubSection');

        const normalizedSubSections: NormalizedSubSection[] = subSectionNodes.map((subNode, subIndex) => ({
            id: `section-${sectionIndex}-sub-${subIndex}`,
            title: subNode.params?.title ?? '',
            isRoot: subNode.params?.root === 'true',
            node: subNode,
        }));

        const rootSubSection = normalizedSubSections.find((s) => s.isRoot);

        return {
            id: `section-${sectionIndex}`,
            title: sectionNode.params?.title ?? '',
            icon: makeIcon(sectionNode.params?.icon),
            rootSubSection,
            subSections: normalizedSubSections.filter((s) => !s.isRoot),
        };
    });
}

export function MenuSection({ children }: MenuSectionProps) {
    return <>{children}</>;
}

export function MenuSubSection({ children }: MenuSubSectionProps) {
    return <>{children}</>;
}

export function Menu(_props: MenuProps) {
    const { node, registry, ctx } = useRuntime();

    const sections = useMemo(() => parseSectionsFromAST(node), [node]);

    const [activeValue, setActiveValue] = useState<string | undefined>(() => {
        const first = sections[0];
        if (!first) return undefined;
        return first.rootSubSection ? first.id : (first.subSections[0]?.id ?? first.id);
    });

    useEffect(() => {
        if (!sections.length) {
            setActiveValue(undefined);
            return;
        }

        const hasActiveValue = sections.some(
            (section) => section.id === activeValue || section.subSections.some((sub) => sub.id === activeValue)
        );

        if (!hasActiveValue) {
            const first = sections[0];
            if (!first) {
                setActiveValue(undefined);
                return;
            }
            setActiveValue(first.rootSubSection ? first.id : (first.subSections[0]?.id ?? first.id));
        }
    }, [activeValue, sections]);

    if (!sections.length) return null;

    return (
        <BaseMenu value={activeValue} onValueChange={setActiveValue} ariaLabel="Longlink menu">
            <aside className="w-64">
                <MenuList>
                    {sections.map((section) => (
                        <BaseMenuSection key={section.id} value={section.id} label={section.title} icon={section.icon}>
                            {section.subSections.map((sub) => (
                                <BaseMenuSubSection key={sub.id} value={sub.id} label={sub.title} />
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
                                {renderNode(section.rootSubSection.node.children, registry, ctx)}
                            </MenuContent>
                        ) : null}

                        {section.subSections.map((sub) => (
                            <MenuContent key={sub.id} value={sub.id}>
                                {renderNode(sub.node.children, registry, ctx)}
                            </MenuContent>
                        ))}
                    </div>
                ))}
            </div>
        </BaseMenu>
    );
}

export default Menu;
