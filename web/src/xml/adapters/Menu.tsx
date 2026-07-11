import { createLucideIconComponent } from '@/components/ui/icon';
import { Menu as UIMenu, MenuSection as UIMenuSection, MenuSubSection as UIMenuSubSection } from '@/components/ui/menu';
import { useXmlContext } from '@/xml/core/context';
import { resolveTranslation } from '@/xml/core/i18n';
import { renderNode } from '@/xml/core/node';
import { evaluate } from '@/xml/expressions';
import type { ASTNode, ASTProps, ExecutionContext, Props } from '@/xml/types';
import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { requireXmlString, resolveXmlString } from './props';

type MenuSectionAttributes = {
    value: string;
    label?: string;
    icon?: LucideIcon;
};

type MenuSubSectionAttributes = {
    value: string;
    label?: string;
};

type MenuAttributeOptions = {
    requireValue?: boolean;
    emptyLabelFallback?: boolean;
};

/** Renders the sidebar-style menu shell. */
export function Menu({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = props.defaultValue == null ? undefined : resolveXmlString(props, 'defaultValue', ctx);
    const value = props.value == null ? undefined : resolveXmlString(props, 'value', ctx);
    const [activeValue, setActiveValue] = useState<string>(value ?? defaultValue ?? '');

    // Keep the XML wrapper in sync with an explicit menu value when one is provided.
    useEffect(() => {
        // Reflect controlled value changes.
        if (value !== undefined) {
            setActiveValue(value);
        }
    }, [value]);

    return (
        <UIMenu value={activeValue} onValueChange={setActiveValue} hashNavigation={ctx.hashNavigation !== false}>
            {renderMenuNodes(nodes, ctx)}
        </UIMenu>
    );
}

/** Renders a root menu section. */
export function MenuSection({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const attributes = resolveMenuSectionAttributes(props, ctx, {
        requireValue: true,
        emptyLabelFallback: true,
    });

    return (
        <UIMenuSection icon={attributes.icon} label={attributes.label} value={attributes.value}>
            {renderNode(nodes, ctx)}
        </UIMenuSection>
    );
}

/** Renders a nested menu subsection. */
export function MenuSubSection({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const attributes = resolveMenuSubSectionAttributes(props, ctx, {
        requireValue: true,
        emptyLabelFallback: true,
    });

    return (
        <UIMenuSubSection label={attributes.label} value={attributes.value}>
            {renderNode(nodes, ctx)}
        </UIMenuSubSection>
    );
}

/** Resolves common root section attributes from XML props. */
function resolveMenuSectionAttributes(
    props: ASTProps,
    ctx: ExecutionContext,
    options: MenuAttributeOptions = {}
): MenuSectionAttributes {
    const value = options.requireValue
        ? requireXmlString(props, 'value', ctx, 'MenuSection')
        : resolveXmlString(props, 'value', ctx);
    const iconName = resolveXmlString(props, 'icon', ctx).trim();

    return {
        value,
        label: resolveMenuLabel(props, ctx, options.emptyLabelFallback ? '' : undefined),
        icon: iconName ? resolveIconComponent(iconName) : undefined,
    };
}

/** Resolves common nested subsection attributes from XML props. */
function resolveMenuSubSectionAttributes(
    props: ASTProps,
    ctx: ExecutionContext,
    options: MenuAttributeOptions = {}
): MenuSubSectionAttributes {
    const value = options.requireValue
        ? requireXmlString(props, 'value', ctx, 'MenuSubSection')
        : resolveXmlString(props, 'value', ctx);

    return {
        value,
        label: resolveMenuLabel(props, ctx, options.emptyLabelFallback ? '' : undefined),
    };
}

/** Resolves a menu label from a translation key or direct label prop. */
function resolveMenuLabel(props: ASTProps, ctx: ExecutionContext, defaultValue?: string): string | undefined {
    // Prefer translated menu labels.
    if (props.i18n) {
        return resolveTranslation(props, ctx);
    }

    // Fall back when no explicit label exists.
    if (props.label == null) {
        return defaultValue;
    }

    return String(evaluate(props.label, ctx) ?? defaultValue ?? '');
}

/** Resolves a Lucide icon component from an XML icon name. */
function resolveIconComponent(name: string) {
    const icon = createLucideIconComponent(name);

    // Reject unsupported names instead of silently rendering a different icon.
    if (icon === null) {
        throw new Error(`Unknown icon "${name}"`);
    }

    return icon as LucideIcon;
}

/** Renders top-level menu section markers for the UI menu parser. */
function renderMenuNodes(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        // Skip nodes hidden by XML conditions.
        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return <Fragment key={index} />;
        }

        // Render non-section nodes normally.
        if (node.name !== 'MenuSection') {
            return <Fragment key={index}>{renderNode([node], ctx)}</Fragment>;
        }

        const attributes = resolveMenuSectionAttributes(node.params ?? {}, ctx);

        return (
            <UIMenuSection key={index} icon={attributes.icon} label={attributes.label} value={attributes.value}>
                {renderMenuSectionChildren(node.children ?? [], ctx)}
            </UIMenuSection>
        );
    });
}

/** Renders nested menu section children while preserving subsection markers. */
function renderMenuSectionChildren(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        // Skip nodes hidden by XML conditions.
        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return <Fragment key={index} />;
        }

        // Render non-subsection nodes normally.
        if (node.name !== 'MenuSubSection') {
            return <Fragment key={index}>{renderNode([node], ctx)}</Fragment>;
        }

        const attributes = resolveMenuSubSectionAttributes(node.params ?? {}, ctx);

        return (
            <UIMenuSubSection key={index} label={attributes.label} value={attributes.value}>
                {renderNode(node.children ?? [], ctx)}
            </UIMenuSubSection>
        );
    });
}
