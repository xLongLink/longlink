import { z } from 'zod';
import { renderNode } from '../core/node';
import { useXmlRuntime } from '../core/context';
import type { ASTNode, Props, Scope } from '../types';
import { stoneIconComponents, type StoneIconName } from '@/components/ui/Icon';
import { isVisibleXmlNode, resolveXmlProps, xmlNonblankStringSchema, xmlSpacingSchema } from '../core/props';
import { Menu as SolutionMenu, type MenuItem, type MenuSection, type MenuEntry } from '@/components/ui/Menu';

const menuSectionPropsSchema = z.object({ isHeaderHidden: z.boolean().optional(), title: xmlNonblankStringSchema });
const menuPropsSchema = z.object({ gap: xmlSpacingSchema.default(3) });
const menuEntryPropsSchema = z.object({
    icon: z
        .string()
        .refine(
            (value: string): value is StoneIconName => Object.hasOwn(stoneIconComponents, value),
            'must be a supported icon name'
        )
        .optional(),
    label: xmlNonblankStringSchema,
});

/** Renders the solution menu from XML sections and items. */
export function Menu({ props, nodes }: Props) {
    const { scope: ctx } = useXmlRuntime();
    const { gap } = resolveXmlProps(props, ctx, menuPropsSchema);

    // Prepare every visible panel before selection so content errors remain observable.
    const sections = nodes
        .filter((node) => isVisibleXmlNode(node, ctx))
        .map((section) => {
            if (section.name !== 'MenuSection') {
                throw new Error('Menu only supports MenuSection children');
            }

            return renderSection(section, ctx);
        });

    return <SolutionMenu gap={gap} sections={sections} />;
}

/** Converts a validated XML section into navigation data. */
function renderSection(node: ASTNode, ctx: Scope): MenuSection {
    const { isHeaderHidden, title } = resolveXmlProps(node.params, ctx, menuSectionPropsSchema, ['title']);

    return {
        isHeaderHidden,
        title,
        entries: node.children.filter((child) => isVisibleXmlNode(child, ctx)).map((child) => renderEntry(child, ctx)),
    };
}

/** Converts an XML item into navigation data and prepares its panel content. */
function renderItem(node: ASTNode, ctx: Scope): MenuItem {
    const { icon, label } = resolveXmlProps(node.params, ctx, menuEntryPropsSchema, ['label']);

    return { content: renderNode(node.children, ctx), icon, kind: 'item', label };
}

/** Converts an XML item or subsection into navigation data. */
function renderEntry(node: ASTNode, ctx: Scope): MenuEntry {
    // Resolve item content eagerly, including panels that are not selected.
    if (node.name === 'MenuItem') {
        return renderItem(node, ctx);
    }

    const { icon, label } = resolveXmlProps(node.params, ctx, menuEntryPropsSchema, ['label']);

    if (node.name === 'MenuSubSection') {
        return {
            icon,
            kind: 'subsection',
            label,
            items: node.children
                .filter((child) => isVisibleXmlNode(child, ctx))
                .map((child) => {
                    if (child.name !== 'MenuItem') {
                        throw new Error('MenuSubSection only supports MenuItem children');
                    }

                    return renderItem(child, ctx);
                }),
        };
    }

    throw new Error(`MenuSection does not support ${node.name} children`);
}
