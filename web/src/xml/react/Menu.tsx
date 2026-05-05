import {
    Menu as BaseMenu,
    MenuSection as BaseMenuSection,
    MenuSubSection as BaseMenuSubSection,
    MenuContent,
    MenuList,
} from '@/ui/menu';
import type { ASTNode, RenderableASTNode } from '@/xml';
import { renderNode, useRuntime } from '@/xml';
import type { LucideIcon } from 'lucide-react';
import { AppWindow } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';

type MenuProps = {
    children?: RenderableASTNode;
};

type MenuSectionProps = {
    title: string;
    icon?: string | null;
    children?: RenderableASTNode;
};

type MenuSubSectionProps = {
    title?: string;
    root?: boolean;
    children?: RenderableASTNode;
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

function makeIcon(iconName: string | undefined): LucideIcon {
    if (!iconName) return AppWindow;
    const name = iconName;

    function ResolvedIcon() {
        return <Icon name={name} fallback="app-window" />;
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
    const { registry, ctx } = useRuntime();
    return <>{renderNode(children, registry, ctx)}</>;
}

export function MenuSubSection({ children }: MenuSubSectionProps) {
    const { registry, ctx } = useRuntime();
    return <>{renderNode(children, registry, ctx)}</>;
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
