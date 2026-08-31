import { z } from 'zod';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import type { ASTNode, Props, Scope } from '../types';
import { stoneIconComponents, type StoneIconName } from '@/components/ui/Icon';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema, xmlSpacingSchema } from '../core/props';
import {
    Menu as ApplicationMenu,
    MenuItem as ApplicationMenuItem,
    MenuSection as ApplicationMenuSection,
    MenuSubSection as ApplicationMenuSubSection,
} from '@/components/ui/Menu';

const menuSectionPropsSchema = z.object({ isHeaderHidden: z.boolean().optional(), title: xmlNonblankStringSchema });
const menuPropsSchema = z.object({ gap: xmlSpacingSchema.optional() });
const menuEntryPropsSchema = z.object({
    icon: z.string().refine(isStoneIconName, 'must be a supported icon name').optional(),
    label: xmlNonblankStringSchema,
});

/** Renders the application menu from XML sections and items. */
export function Menu({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { gap } = resolveXmlProps(props, ctx, { gap: 'scalar' }, menuPropsSchema);
    const sections = nodes.filter((node) => isVisibleXmlNode(node, ctx));

    return (
        <ApplicationMenu gap={gap}>
            {sections.map((section) => {
                if (section.name !== 'MenuSection') {
                    throw new Error('Menu only supports MenuSection children');
                }

                return renderSection(section, ctx);
            })}
        </ApplicationMenu>
    );
}

/** Converts an XML menu section into the application menu marker. */
function renderSection(node: ASTNode, ctx: Scope) {
    const { isHeaderHidden, title } = resolveXmlProps(
        node.params,
        ctx,
        { isHeaderHidden: 'scalar', title: 'raw' },
        menuSectionPropsSchema
    );

    return (
        <ApplicationMenuSection isHeaderHidden={isHeaderHidden} key={title} title={title}>
            {node.children.filter((child) => isVisibleXmlNode(child, ctx)).map((child) => renderEntry(child, ctx))}
        </ApplicationMenuSection>
    );
}

/** Converts an XML menu item or subsection into an application menu marker. */
function renderEntry(node: ASTNode, ctx: Scope) {
    const { icon, label } = resolveXmlProps(node.params, ctx, { icon: 'scalar', label: 'raw' }, menuEntryPropsSchema);

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

/** Returns whether a value identifies an icon supported by the application menu. */
function isStoneIconName(value: string): value is StoneIconName {
    return Object.hasOwn(stoneIconComponents, value);
}
