import { evaluate } from '@xml/core/expressions';
import { Menu, MenuContent, MenuList, MenuSection, MenuSubSection } from '@xml/react/Menu';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type Key, type ReactNode } from 'react';

type XmlRenderAdapter = (node: ASTNode, ctx: ExecutionContext, key: Key) => ReactNode;

/** Coerces XML boolean-like attributes into React boolean props. */
function booleanAttribute(value: unknown): boolean | undefined {
    if (value === false || value === 'false') return false;
    if (value == null) return undefined;

    return true;
}


/** Central registry for XML tags that render through dedicated adapters. */
const xmlComponentRegistry: Record<string, XmlRenderAdapter> = {
    State: (_node, _ctx, key) => <Fragment key={key} />,
    Query: (_node, _ctx, key) => <Fragment key={key} />,
    Menu: (node, ctx, key) => {
        const defaultValue = node.params?.defaultValue
            ? String(evaluate(node.params.defaultValue, ctx) ?? '')
            : undefined;
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;

        return <Menu key={key} defaultValue={defaultValue} value={value} children={node.children} />;
    },
    MenuList: (node, _ctx, key) => <MenuList key={key} children={node.children} />,
    MenuSection: (node, ctx, key) => {
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;
        const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
        const disabled = booleanAttribute(node.params?.disabled ? evaluate(node.params.disabled, ctx) : undefined);

        return <MenuSection key={key} value={value} label={label} disabled={disabled} children={node.children} />;
    },
    MenuSubSection: (node, ctx, key) => {
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;
        const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
        const disabled = booleanAttribute(node.params?.disabled ? evaluate(node.params.disabled, ctx) : undefined);

        return <MenuSubSection key={key} value={value} label={label} disabled={disabled} children={node.children} />;
    },
    MenuContent: (node, ctx, key) => {
        const value = node.params?.value ? String(evaluate(node.params.value, ctx) ?? '') : undefined;
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <MenuContent key={key} value={value} className={className} children={node.children} />;
    },
};


/** Renders a registered XML component, returning undefined for tags still handled by the legacy renderer. */
export function renderRegisteredNode(node: ASTNode, ctx: ExecutionContext, key: Key): ReactNode | undefined {
    return xmlComponentRegistry[node.name]?.(node, ctx, key);
}


/** Returns the names currently owned by the central XML component registry. */
export function getRegisteredXmlComponentNames(): string[] {
    return Object.keys(xmlComponentRegistry);
}
