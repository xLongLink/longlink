import { z } from 'zod';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import type { ASTNode, Props, Scope } from '../types';
import { stoneIconComponents, type StoneIconName } from '@/components/ui/Icon';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema, xmlSpacingSchema } from '../core/props';
import {
    Menu as SolutionMenu,
    MenuItem as SolutionMenuItem,
    MenuSection as SolutionMenuSection,
    MenuSubSection as SolutionMenuSubSection,
} from '@/components/ui/Menu';

const menuSectionPropsSchema = z.object({ isHeaderHidden: z.boolean().optional(), title: xmlNonblankStringSchema });
const menuPropsSchema = z.object({ gap: xmlSpacingSchema.optional() });
const menuEntryPropsSchema = z.object({
    icon: z.string().refine(isStoneIconName, 'must be a supported icon name').optional(),
    label: xmlNonblankStringSchema,
});

/** Renders the solution menu from XML sections and items. */
export function Menu({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { gap } = resolveXmlProps(props, ctx, { gap: 'scalar' }, menuPropsSchema);

    return (
        <SolutionMenu gap={gap}>
            {nodes
                .filter((node) => isVisibleXmlNode(node, ctx))
                .map((section) => {
                    if (section.name !== 'MenuSection') {
                        throw new Error('Menu only supports MenuSection children');
                    }

                    return renderSection(section, ctx);
                })}
        </SolutionMenu>
    );
}

/** Converts an XML menu section into the solution menu marker. */
function renderSection(node: ASTNode, ctx: Scope) {
    const { isHeaderHidden, title } = resolveXmlProps(
        node.params,
        ctx,
        { isHeaderHidden: 'scalar', title: 'raw' },
        menuSectionPropsSchema
    );

    return (
        <SolutionMenuSection isHeaderHidden={isHeaderHidden} key={title} title={title}>
            {node.children.filter((child) => isVisibleXmlNode(child, ctx)).map((child) => renderEntry(child, ctx))}
        </SolutionMenuSection>
    );
}

/** Converts an XML menu item or subsection into the solution menu marker. */
function renderEntry(node: ASTNode, ctx: Scope) {
    const { icon, label } = resolveXmlProps(node.params, ctx, { icon: 'scalar', label: 'raw' }, menuEntryPropsSchema);

    if (node.name === 'MenuItem') {
        return (
            <SolutionMenuItem icon={icon} key={label} label={label}>
                {renderNode(node.children, ctx)}
            </SolutionMenuItem>
        );
    }

    if (node.name === 'MenuSubSection') {
        return (
            <SolutionMenuSubSection icon={icon} key={label} label={label}>
                {node.children
                    .filter((child) => isVisibleXmlNode(child, ctx))
                    .map((child) => {
                        if (child.name !== 'MenuItem') {
                            throw new Error('MenuSubSection only supports MenuItem children');
                        }

                        return renderEntry(child, ctx);
                    })}
            </SolutionMenuSubSection>
        );
    }

    throw new Error(`MenuSection does not support ${node.name} children`);
}

/** Returns whether a value identifies an icon supported by the solution menu. */
function isStoneIconName(value: string): value is StoneIconName {
    return Object.hasOwn(stoneIconComponents, value);
}
