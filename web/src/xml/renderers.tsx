import { Fragment, type ReactNode } from 'react';
import { registry } from './registry';
import { evaluate, resolveBind, resolveCondition, RuntimeProvider } from './runtime';
import type { ASTNode, ExecutionContext, RenderableASTNode } from './types';

/**
 * Converts raw ASTNode params into resolved React props.
 *
 * - `if` is stripped (consumed by the caller for conditional rendering).
 * - Values prefixed with `$` connect props to state and add matching change handlers.
 * - All remaining attributes are resolved via `evaluate`.
 */
/**
 * Resolves XML attributes into React props for a rendered node.
 */
function resolveParams(params: ASTNode['params'], ctx: ExecutionContext): Record<string, unknown> {
    if (!params) return {};

    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
        if (key === 'if') continue;

        if (typeof value === 'string' && value.startsWith('$')) {
            const binding = resolveBind(value.slice(1), ctx);
            resolved[key] = binding.value;
            resolved[toChangeHandlerName(key)] = binding.setValue;
            continue;
        }

        resolved[key] = evaluate(value, ctx);
    }

    return resolved;
}

/** Converts a bound prop name into the React-style change callback name. */
function toChangeHandlerName(propName: string): string {
    if (propName === 'value' || propName === 'checked' || propName === 'active') {
        return 'onChange';
    }

    return `on${propName.charAt(0).toUpperCase()}${propName.slice(1)}Change`;
}

/**
 * Renders a single ASTNode (or array/null) into React elements.
 *
 * - Text nodes are resolved through the same `{expression}` rule and returned as strings.
 * - Nodes whose `if` param evaluates to false are skipped.
 * - Component lookup is performed against the registry; unknown tags throw.
 * - Each rendered element is wrapped in a RuntimeProvider so child primitives
 *   and `<RuntimeChildren />` can access the current node, registry, and context.
 */
export function renderNode(node: RenderableASTNode, ctx: ExecutionContext): ReactNode {
    if (!node) return null;

    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, ctx)}</Fragment>);
    }

    if (node.name === 'text') {
        return node.value ? evaluate(node.value, ctx, 'string') : null;
    }

    if (!resolveCondition(node.params?.if, ctx)) {
        return null;
    }

    const component = registry[node.name];

    if (!component) {
        throw new Error(`Unknown component "${node.name}"`);
    }

    const Component = component;

    return (
        <RuntimeProvider value={{ ctx, props: node.params ?? {}, children: node.children }}>
            <Component props={node.params ?? {}} children={node.children} />
        </RuntimeProvider>
    );
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], ctx: ExecutionContext): ReactNode {
    return ast.map((node, index) => <Fragment key={index}>{renderNode(node, ctx)}</Fragment>);
}
