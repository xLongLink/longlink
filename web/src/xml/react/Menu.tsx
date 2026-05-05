import {
    Menu as BaseMenu,
    MenuSection as BaseMenuSection,
    MenuSubSection as BaseMenuSubSection,
    MenuContent,
    MenuList,
} from '@/ui/menu';
import type { ASTNode, XmlComponentProps } from '@/xml';
import { renderXml } from '@/xml';
import type { LucideIcon } from 'lucide-react';
import { AppWindow } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';

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

function makeIcon(iconName: string | undefined): LucideIcon {
    if (!iconName) return AppWindow;
    const name = iconName;

    function ResolvedIcon() {
        return <Icon name={name} fallback="app-window" />;
    }

    return ResolvedIcon as unknown as LucideIcon;
}

function parseSectionsFromAST(menuNode: ASTNode): NormalizedSection[] {
    const children = Array.isArray(menuNode.children) ? menuNode.children : [];
    const sectionNodes = children.filter((node): node is ASTNode => node.name === 'MenuSection');
    return sectionNodes.map((sectionNode, sectionIndex) => {
        const sectionChildren = Array.isArray(sectionNode.children) ? sectionNode.children : [];
        const subSectionNodes = sectionChildren.filter((node): node is ASTNode => node.name === 'MenuSubSection');
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

export function MenuSection({ props: _props, children }: XmlComponentProps) {
    return <>{renderXml(children)}</>;
}

export function MenuSubSection({ props: _props, children }: XmlComponentProps) {
    return <>{renderXml(children)}</>;
}

export function Menu({ props: _props, children }: XmlComponentProps) {
    const sections = useMemo(() => parseSectionsFromAST({ name: 'Menu', children: children as any }), [children]);
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
        <BaseMenu value={activeValue} onValueChange={setActiveValue} ariaLabel="LongLink menu">
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
                                {renderXml(section.rootSubSection.node.children)}
                            </MenuContent>
                        ) : null}
                        {section.subSections.map((sub) => (
                            <MenuContent key={sub.id} value={sub.id}>
                                {renderXml(sub.node.children)}
                            </MenuContent>
                        ))}
                    </div>
                ))}
            </div>
        </BaseMenu>
    );
}
