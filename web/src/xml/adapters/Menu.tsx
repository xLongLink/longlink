import { createLucideIconComponent } from '@/components/ui/icon';
import { Menu as UIMenu, MenuSection as UIMenuSection, MenuSubSection as UIMenuSubSection } from '@ui/menu';
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import { evaluate } from '@xml/expressions';
import type { ASTNode, ASTProps, ExecutionContext, Props } from '@xml/types';
import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { requireXmlString, resolveXmlBoolean, resolveXmlString } from './props';

type MenuSectionAttributes = {
    value: string;
    label?: string;
    icon?: LucideIcon;
    disabled?: boolean;
};

type MenuSubSectionAttributes = {
    value: string;
    label?: string;
    disabled?: boolean;
};

type MenuAttributeOptions = {
    requireValue?: boolean;
    emptyLabelFallback?: boolean;
    astBoolean?: boolean;
};

/** Renders the sidebar-style menu shell. */
export function Menu({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = props.defaultValue == null ? undefined : resolveXmlString(props, 'defaultValue', ctx);
    const value = props.value == null ? undefined : resolveXmlString(props, 'value', ctx);
    const [activeValue, setActiveValue] = useState<string>(value ?? defaultValue ?? '');

    // Keep the XML wrapper in sync with an explicit menu value when one is provided.
    useEffect(() => {
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
        <UIMenuSection
            disabled={attributes.disabled}
            icon={attributes.icon}
            label={attributes.label}
            value={attributes.value}
        >
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
        <UIMenuSubSection disabled={attributes.disabled} label={attributes.label} value={attributes.value}>
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
        disabled: resolveMenuDisabled(props, ctx, options.astBoolean),
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
        disabled: resolveMenuDisabled(props, ctx, options.astBoolean),
    };
}

/** Resolves a menu label while preserving direct component fallback behavior. */
function resolveMenuLabel(props: ASTProps, ctx: ExecutionContext, defaultValue?: string): string | undefined {
    if (props.i18n) {
        return resolveTranslation(props, ctx);
    }

    if (props.label == null) {
        return defaultValue;
    }

    return String(evaluate(props.label, ctx) ?? defaultValue ?? '');
}

/** Resolves disabled state with the same boolean rules as each rendering path. */
function resolveMenuDisabled(props: ASTProps, ctx: ExecutionContext, astBoolean?: boolean): boolean | undefined {
    if (astBoolean) {
        return booleanAttribute(props.disabled ? evaluate(props.disabled, ctx) : undefined);
    }

    return resolveXmlBoolean(props, 'disabled', ctx);
}

/** Coerces XML boolean-like attributes into React boolean props. */
function booleanAttribute(value: unknown): boolean | undefined {
    if (value === false || value === 'false') return false;
    if (value == null) return undefined;

    return true;
}

/** Resolves a Lucide icon component from an XML icon name. */
function resolveIconComponent(name: string) {
    return createLucideIconComponent(name) as LucideIcon;
}

/** Renders top-level menu section markers for the UI menu parser. */
function renderMenuNodes(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return <Fragment key={index} />;
        }

        if (node.name !== 'MenuSection') {
            return <Fragment key={index}>{renderNode([node], ctx)}</Fragment>;
        }

        const attributes = resolveMenuSectionAttributes(node.params ?? {}, ctx, { astBoolean: true });

        return (
            <UIMenuSection
                key={index}
                disabled={attributes.disabled}
                icon={attributes.icon}
                label={attributes.label}
                value={attributes.value}
            >
                {renderMenuSectionChildren(node.children ?? [], ctx)}
            </UIMenuSection>
        );
    });
}

/** Renders nested menu section children while preserving subsection markers. */
function renderMenuSectionChildren(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return <Fragment key={index} />;
        }

        if (node.name !== 'MenuSubSection') {
            return <Fragment key={index}>{renderNode([node], ctx)}</Fragment>;
        }

        const attributes = resolveMenuSubSectionAttributes(node.params ?? {}, ctx, { astBoolean: true });

        return (
            <UIMenuSubSection
                key={index}
                disabled={attributes.disabled}
                label={attributes.label}
                value={attributes.value}
            >
                {renderNode(node.children ?? [], ctx)}
            </UIMenuSubSection>
        );
    });
}
