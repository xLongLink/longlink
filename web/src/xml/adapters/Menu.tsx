import { createLucideIconComponent } from '@/components/ui/icon';
import { Menu as UIMenu, MenuSection as UIMenuSection, MenuSubSection as UIMenuSubSection } from '@ui/menu';
import { useXmlContext } from '@xml/core/context';
import { resolveTranslation } from '@xml/core/i18n';
import { renderNode } from '@xml/core/node';
import { evaluate } from '@xml/expressions';
import type { ASTNode, ExecutionContext, Props } from '@xml/types';
import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { requireXmlString, resolveXmlBoolean, resolveXmlString } from './props';

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
        <UIMenu value={activeValue} onValueChange={setActiveValue}>
            {renderMenuNodes(nodes, ctx)}
        </UIMenu>
    );
}

/** Renders a root menu section. */
export function MenuSection({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = requireXmlString(props, 'value', ctx, 'MenuSection');
    const label = props.i18n ? resolveTranslation(props, ctx) : resolveXmlString(props, 'label', ctx);
    const icon = resolveXmlString(props, 'icon', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);
    const iconName = icon.trim();

    // Resolve the optional icon lazily so menu sections can showcase Lucide icons by XML name.
    const IconComponent = iconName ? resolveIconComponent(iconName) : null;

    return (
        <UIMenuSection disabled={disabled} icon={IconComponent ?? undefined} label={label} value={value}>
            {renderNode(nodes, ctx)}
        </UIMenuSection>
    );
}

/** Renders a nested menu subsection. */
export function MenuSubSection({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = requireXmlString(props, 'value', ctx, 'MenuSubSection');
    const label = props.i18n ? resolveTranslation(props, ctx) : resolveXmlString(props, 'label', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);

    return (
        <UIMenuSubSection disabled={disabled} label={label} value={value}>
            {renderNode(nodes, ctx)}
        </UIMenuSubSection>
    );
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

        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : '';
        const label = node.params?.i18n
            ? resolveTranslation(node.params, ctx)
            : node.params?.label
              ? String(evaluate(node.params.label, ctx) ?? '')
              : undefined;
        const icon = node.params?.icon ? String(evaluate(node.params.icon, ctx) ?? '') : '';
        const disabled = booleanAttribute(node.params?.disabled ? evaluate(node.params.disabled, ctx) : undefined);
        const IconComponent = icon.trim() ? resolveIconComponent(icon) : null;

        return (
            <UIMenuSection
                key={index}
                disabled={disabled}
                icon={IconComponent ?? undefined}
                label={label}
                value={value}
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

        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : '';
        const label = node.params?.i18n
            ? resolveTranslation(node.params, ctx)
            : node.params?.label
              ? String(evaluate(node.params.label, ctx) ?? '')
              : undefined;
        const disabled = booleanAttribute(node.params?.disabled ? evaluate(node.params.disabled, ctx) : undefined);

        return (
            <UIMenuSubSection key={index} disabled={disabled} label={label} value={value}>
                {renderNode(node.children ?? [], ctx)}
            </UIMenuSubSection>
        );
    });
}
