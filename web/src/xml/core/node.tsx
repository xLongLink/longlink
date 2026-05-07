import { compile, evaluate, isText } from '@xml/core/expressions';
import { P } from '@xml/html/P';
import { For } from '@xml/primitives/For';
import { Page } from '@xml/primitives/Page';
import { Text } from '@xml/primitives/Text';
import { Button } from '@xml/react/Button';
import { Input } from '@xml/react/Input';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(node: ASTNode | ASTNode[] | null, ctx: ExecutionContext): ReactNode {
    // Handle null/undefined early to avoid unnecessary component resolution and error boundaries.
    if (!node) return <></>;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, ctx)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null) {
        if (!Boolean(evaluate(node.params.if, ctx))) {
            return <></>;
        }
    }

    // For and State component are already handled in the setupContext
    if (node.name === 'State' || node.name === 'Query') return <></>;

    if (node.name === 'For') {
        // If there are no children, there's nothing to render, so we can skip the "For" component entirely.
        if (!node.children) return <></>;

        // Ensure that the parameters are defined
        if (!node.params?.as) throw new Error(`Missing "as" parameter on "For" component`);
        if (!node.params?.each) throw new Error(`Missing "each" parameter on "For" component`);

        const each = evaluate(node.params.each, ctx);

        if (!Array.isArray(each)) throw new Error(`For.each must evaluate to an array, but got ${typeof each}`);
        return <For each={each} as={node.params.as} children={node.children} />;
    }

    if (node.name === 'Text') {
        if (!node.params?.value) return <></>;

        let value = evaluate(node.params.value, ctx);
        if (typeof value !== 'string') throw new Error(`Text.value must evaluate to a string, but got ${typeof value}`);

        return <Text value={value} />;
    }

    if (node.name === 'Page') {
        if (!node.params?.name) throw new Error(`Missing required "name" parameter on Page component`);
        if (!isText(node.params.name)) throw new Error(`Page.name must be a text parameter`);
        const name = String(node.params.name);
        const icon = node.params?.icon ? String(node.params.icon) : undefined;

        return <Page name={name} icon={icon} children={node.children} />;
    }

    if (node.name === 'P' || node.name === 'p') {
        return <P children={node.children} />;
    }

    if (node.name === 'Button') {
        const action = node.params?.action ? String(evaluate(node.params.action, ctx) ?? '') : '';
        const invalidateValue = node.params?.invalidate ? evaluate(node.params.invalidate, ctx) : [];
        const invalidate = Array.isArray(invalidateValue) ? (invalidateValue as string[]) : [];
        const json = node.params?.json ? compile(String(node.params.json)) : null;
        const method = node.params?.method ? String(evaluate(node.params.method, ctx) ?? 'POST') : 'POST';
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'md') : 'md';
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

        return (
            <Button
                action={action}
                invalidate={invalidate}
                json={json}
                method={method}
                size={size}
                variant={variant}
                children={node.children}
            />
        );
    }

    if (node.name === 'Input') {
        const placeholder = node.params?.placeholder
            ? (evaluate(node.params.placeholder, ctx) as string | number | boolean | undefined)
            : undefined;
        const value = node.params?.value
            ? (evaluate(node.params.value, ctx) as string | number | boolean | undefined)
            : undefined;
        const type = node.params?.type ? String(evaluate(node.params.type, ctx) ?? 'text') : 'text';

        return <Input placeholder={placeholder} value={value} type={type} />;
    }

    throw new Error(`Unknown component "${node.name}"`);
}
