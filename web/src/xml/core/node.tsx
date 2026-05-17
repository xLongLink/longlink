import { ContextProvider } from '@xml/core/context';
import { compile, evaluate } from '@xml/core/expressions';
import { state } from '@xml/core/state';
import { P } from '@xml/html/P';
import { For } from '@xml/primitives/For';
import { Page } from '@xml/primitives/Page';
import { Text } from '@xml/primitives/Text';
import { Badge } from '@xml/react/Badge';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@xml/react/Card';
import { Button } from '@xml/react/Button';
import { Hero, HeroContent, HeroDescription, HeroTitle } from '@xml/react/Hero';
import { Divider } from '@xml/react/Divider';
import { Input } from '@xml/react/Input';
import type { ASTNode, ExecutionContext } from '@xml/types';
import { Fragment, type ReactNode } from 'react';

/** Renders XML AST nodes using the active runtime context. */
export function renderNode(node: ASTNode | ASTNode[] | null, ctx: ExecutionContext): ReactNode {
    // Handle null/undefined early to avoid unnecessary component resolution and error boundaries.
    if (!node) return null;

    // Handle arrays of nodes as fragments with stable keys.
    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, ctx)}</Fragment>);
    }

    // Handle conditional rendering with "if" parameter.
    if (node.params?.if != null) {
        if (!evaluate(node.params.if, ctx)) {
            return <></>;
        }
    }

    // State nodes seed a scoped child context so descendants can resolve initial values immediately.
    if (node.name === 'State') {
        if (!node.params?.id) throw new Error('State requires a string id');
        if (!node.params?.value) throw new Error('State requires a value');

        const childCtx: ExecutionContext = {
            parent: ctx,
            setups: ctx.setups,
            invalidate: ctx.invalidate,
            values: { ...ctx.values },
        };

        state(childCtx, node.params.id.trim(), node.params.value);

        return node.children ? (
            <ContextProvider value={childCtx}>{renderNode(node.children, childCtx)}</ContextProvider>
        ) : (
            <></>
        );
    }

    // Query nodes are validated here and resolved by the runtime setup pass.
    if (node.name === 'Query') {
        if (!node.params?.id) throw new Error('Query requires a string id');
        if (!node.params?.path) throw new Error('Query requires a string path');

        return node.children ? renderNode(node.children, ctx) : <></>;
    }

    if (node.name === 'For') {
        // Ensure that the parameters are defined
        if (!node.params?.as) throw new Error(`For requires an "as" parameter`);
        if (!node.params?.each) throw new Error(`For requires an "each" parameter`);

        // If there are no children, there's nothing to render, so we can skip the "For" component entirely.
        if (!node.children) return <></>;

        const each = evaluate(node.params.each, ctx);

        if (!Array.isArray(each)) return <></>;
        return <For each={each} as={node.params.as} children={node.children} />;
    }

    if (node.name === 'Text') {
        if (!node.params?.value) return <></>;

        const value = evaluate(node.params.value, ctx);
        if (typeof value !== 'string') throw new Error(`Text.value must evaluate to a string, but got ${typeof value}`);

        return <Text value={value} />;
    }

    if (node.name === 'Page') {
        const icon = node.params?.icon ? String(node.params.icon) : undefined;

        return <Page icon={icon} children={node.children} />;
    }

    if (node.name === 'Divider') {
        return <Divider />;
    }

    if (node.name === 'Hero') {
        const icon = node.params?.icon ? String(node.params.icon) : undefined;

        return <Hero icon={icon} children={node.children} />;
    }

    if (node.name === 'HeroTitle') {
        return <HeroTitle children={node.children} />;
    }

    if (node.name === 'HeroDescription') {
        return <HeroDescription children={node.children} />;
    }

    if (node.name === 'HeroContent') {
        return <HeroContent children={node.children} />;
    }

    if (node.name === 'p') {
        return <P children={node.children} />;
    }

    if (node.name === 'Button') {
        const action = node.params?.action ? String(evaluate(node.params.action, ctx) ?? '') : '';
        const invalidateValue = node.params?.invalidate ? evaluate(node.params.invalidate, ctx) : [];
        const invalidate = Array.isArray(invalidateValue) ? (invalidateValue as string[]) : [];
        const json = node.params?.json ? compile(String(node.params.json)) : null;
        const method = node.params?.method ? String(evaluate(node.params.method, ctx) ?? 'POST') : 'POST';
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';
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

    if (node.name === 'Badge') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const variant = node.params?.variant ? String(evaluate(node.params.variant, ctx) ?? 'default') : 'default';

        return <Badge className={className} variant={variant} children={node.children} />;
    }

    if (node.name === 'Card') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;
        const size = node.params?.size ? String(evaluate(node.params.size, ctx) ?? 'default') : 'default';

        return <Card className={className} size={size} children={node.children} />;
    }

    if (node.name === 'CardHeader') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardHeader className={className} children={node.children} />;
    }

    if (node.name === 'CardTitle') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardTitle className={className} children={node.children} />;
    }

    if (node.name === 'CardDescription') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardDescription className={className} children={node.children} />;
    }

    if (node.name === 'CardAction') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardAction className={className} children={node.children} />;
    }

    if (node.name === 'CardContent') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardContent className={className} children={node.children} />;
    }

    if (node.name === 'CardFooter') {
        const className = node.params?.className ? String(evaluate(node.params.className, ctx) ?? '') : undefined;

        return <CardFooter className={className} children={node.children} />;
    }

    if (node.name === 'Input') {
        const label = node.params?.label ? String(evaluate(node.params.label, ctx) ?? '') : undefined;
        const placeholder = node.params?.placeholder
            ? (evaluate(node.params.placeholder, ctx) as string | number | boolean | undefined)
            : undefined;
        const value = node.params?.value
            ? (evaluate(node.params.value, ctx) as string | number | boolean | undefined)
            : undefined;
        const type = node.params?.type ? String(evaluate(node.params.type, ctx) ?? 'text') : 'text';

        return <Input label={label} placeholder={placeholder} value={value} type={type} />;
    }

    throw new Error(`Unknown component "${node.name}"`);
}
