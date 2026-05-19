import {
    Menu as UIMenu,
    MenuContent as UIMenuContent,
    MenuList as UIMenuList,
    MenuSection as UIMenuSection,
    MenuSubSection as UIMenuSubSection,
} from '@ui/menu';
import { Fragment, type ReactNode, useEffect, useState } from 'react';
import { useXmlContext } from '@xml/core/context';
import { renderNode } from '@xml/core/node';
import { evaluate } from '@xml/expressions';
import type { ASTNode, ExecutionContext, Props } from '@xml/types';
import { resolveXmlBoolean, resolveXmlString } from './props';

/** Props accepted by the XML Menu component. */

/** Props accepted by the XML MenuList component. */

/** Props accepted by the XML MenuSection component. */

/** Props accepted by the XML MenuSubSection component. */

/** Props accepted by the XML MenuContent component. */

/** Renders the sidebar-style menu shell. */
export function Menu({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const defaultValue = resolveXmlString(props, 'defaultValue', ctx);
    const value = resolveXmlString(props, 'value', ctx);
    const [activeValue, setActiveValue] = useState<string>(value ?? defaultValue ?? '');

    // Keep the XML wrapper in sync with an explicit menu value when one is provided.
    useEffect(() => {
        if (value !== undefined) {
            setActiveValue(value);
        }
    }, [value]);

    return (
        <UIMenu value={activeValue} onValueChange={setActiveValue}>
            {renderNode(nodes, ctx)}
        </UIMenu>
    );
}

/** Renders the menu list slot. */
export function MenuList({ props, nodes }: Props) {
    const { ctx } = useXmlContext();

    return <UIMenuList>{renderMenuListNodes(nodes, ctx)}</UIMenuList>;
}

/** Renders a root menu section. */
export function MenuSection({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlString(props, 'value', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);

    if (!value) throw new Error('MenuSection requires a value');

    return (
        <UIMenuSection disabled={disabled} label={label} value={value}>
            {renderNode(nodes, ctx)}
        </UIMenuSection>
    );
}

/** Renders a nested menu subsection. */
export function MenuSubSection({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlString(props, 'value', ctx);
    const label = resolveXmlString(props, 'label', ctx);
    const disabled = resolveXmlBoolean(props, 'disabled', ctx);

    if (!value) throw new Error('MenuSubSection requires a value');

    return (
        <UIMenuSubSection disabled={disabled} label={label} value={value}>
            {renderNode(nodes, ctx)}
        </UIMenuSubSection>
    );
}

/** Renders the active menu content panel. */
export function MenuContent({ props, nodes }: Props) {
    const { ctx } = useXmlContext();
    const value = resolveXmlString(props, 'value', ctx);
    const className = resolveXmlString(props, 'className', ctx);

    if (!value) throw new Error('MenuContent requires a value');

    return (
        <UIMenuContent className={className} value={value}>
            {renderNode(nodes, ctx)}
        </UIMenuContent>
    );
}

/** Coerces XML boolean-like attributes into React boolean props. */
function booleanAttribute(value: unknown): boolean | undefined {
    if (value === false || value === 'false') return false;
    if (value == null) return undefined;

    return true;
}

/** Renders AST menu section markers for the underlying UI menu parser. */
function renderMenuListNodes(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return <Fragment key={index} />;
        }

        if (node.name !== 'MenuSection') {
            return <Fragment key={index}>{renderNode([node], ctx)}</Fragment>;
        }

        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : '';
        const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
        const disabled = booleanAttribute(node.params?.disabled ? evaluate(node.params.disabled, ctx) : undefined);

        return (
            <UIMenuSection key={index} disabled={disabled} label={label} value={value}>
                {renderMenuSectionChildren(node.children ?? [], ctx)}
            </UIMenuSection>
        );
    });
}

/** Renders nested menu section children while preserving subsection marker elements. */
function renderMenuSectionChildren(nodes: ASTNode[], ctx: ExecutionContext): ReactNode {
    return nodes.map((node, index) => {
        if (node.params?.if != null && !evaluate(node.params.if, ctx)) {
            return <Fragment key={index} />;
        }

        if (node.name !== 'MenuSubSection') {
            return <Fragment key={index}>{renderNode([node], ctx)}</Fragment>;
        }

        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : '';
        const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
        const disabled = booleanAttribute(node.params?.disabled ? evaluate(node.params.disabled, ctx) : undefined);

        return (
            <UIMenuSubSection key={index} disabled={disabled} label={label} value={value}>
                {renderNode(node.children ?? [], ctx)}
            </UIMenuSubSection>
        );
    });
}
