import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import type { ASTNode, Props, Scope } from '../types';
import { stoneIconComponents, type StoneIconName } from '@/components/ui/Icon';
import { isVisibleXmlNode, requireXmlString, resolveXml, resolveXmlGap } from '../core/props';
import {
    Menu as ApplicationMenu,
    MenuItem as ApplicationMenuItem,
    MenuSection as ApplicationMenuSection,
    MenuSubSection as ApplicationMenuSubSection,
} from '@/components/ui/Menu';

/** Renders the application menu from XML sections and items. */
export function Menu({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const gap = resolveXmlGap(props, ctx, 'Menu');
    const sections = nodes.filter((node) => isVisibleXmlNode(node, ctx));

    for (const section of sections) {
        if (section.name !== 'MenuSection') {
            throw new Error('Menu only supports MenuSection children');
        }
    }

    return <ApplicationMenu gap={gap}>{sections.map((section) => renderSection(section, ctx))}</ApplicationMenu>;
}

/** Converts an XML menu section into the application menu marker. */
function renderSection(node: ASTNode, ctx: Scope) {
    const isHeaderHidden = resolveXml(node.params, 'isHeaderHidden', ctx);
    if (isHeaderHidden !== undefined && typeof isHeaderHidden !== 'boolean') {
        throw new Error('MenuSection isHeaderHidden must resolve to a boolean');
    }

    const title = requireXmlString(node.params, 'title', ctx, 'MenuSection');

    return (
        <ApplicationMenuSection isHeaderHidden={isHeaderHidden} key={title} title={title}>
            {node.children.filter((child) => isVisibleXmlNode(child, ctx)).map((child) => renderEntry(child, ctx))}
        </ApplicationMenuSection>
    );
}

/** Converts an XML menu item or subsection into an application menu marker. */
function renderEntry(node: ASTNode, ctx: Scope) {
    const label = requireXmlString(node.params, 'label', ctx, node.name);
    const icon = resolveIcon(node, ctx);

    if (node.name === 'MenuItem') {
        return (
            <ApplicationMenuItem icon={icon} key={label} label={label}>
                {renderNode(node.children, ctx)}
            </ApplicationMenuItem>
        );
    }

    if (node.name === 'MenuSubSection') {
        return (
            <ApplicationMenuSubSection icon={icon} key={label} label={label}>
                {node.children
                    .filter((child) => isVisibleXmlNode(child, ctx))
                    .map((child) => {
                        if (child.name !== 'MenuItem') {
                            throw new Error('MenuSubSection only supports MenuItem children');
                        }

                        return renderEntry(child, ctx);
                    })}
            </ApplicationMenuSubSection>
        );
    }

    throw new Error(`MenuSection does not support ${node.name} children`);
}

/** Resolves one supported application menu icon. */
function resolveIcon(node: ASTNode, ctx: Scope): StoneIconName | undefined {
    const icon = resolveXml(node.params, 'icon', ctx);
    if (icon === undefined) {
        return undefined;
    }
    if (typeof icon !== 'string' || !isStoneIconName(icon)) {
        throw new Error(`${node.name} icon must be a supported icon name`);
    }

    return icon;
}

/** Returns whether a value identifies an icon supported by the application menu. */
function isStoneIconName(value: string): value is StoneIconName {
    return Object.hasOwn(stoneIconComponents, value);
}
