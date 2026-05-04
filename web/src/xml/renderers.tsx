import { Fragment, createElement, type ReactNode } from 'react';
import { resolveBind, resolveCondition, resolveSet, resolveValue, RuntimeChildren, RuntimeProvider } from './runtime';
import type { ASTNode, ExecutionContext, RegistryShape, RenderableASTNode } from './types';

/**
 * Converts raw ASTNode params into resolved React props.
 *
 * - `if` is stripped (consumed by the caller for conditional rendering).
 * - `bind:<prop>` attributes connect props to state and add matching change handlers.
 * - `set:<target>` attributes are collected into a single `onClick` handler.
 *   Each handler evaluates its value expression and writes to the named state
 *   path when the element is clicked (see `resolveSet`).
 * - All remaining attributes are resolved via `resolveValue`.
 */
/**
 * Resolves XML attributes into React props for a rendered node.
 */
function resolveParams(params: ASTNode['params'], ctx: ExecutionContext): Record<string, unknown> {
    if (!params) return {};

    const resolved: Record<string, unknown> = {};
    const setHandlers: Array<() => void> = [];

    /* Resolve each attribute: if/else for conditionals, set: for state writes, rest via resolveValue */
    for (const [key, value] of Object.entries(params)) {
        if (key === 'if') continue;

        if (key.startsWith('bind:')) {
            const propName = key.slice(5);

            if (!propName) {
                throw new Error('bind: missing prop name');
            }

            const binding = resolveBind(value, ctx);
            resolved[propName] = binding.value;
            resolved[toChangeHandlerName(propName)] = binding.setValue;
            continue;
        }

        if (key.startsWith('set:')) {
            setHandlers.push(resolveSet(key.slice(4), value, ctx));
            continue;
        }

        resolved[key] = resolveValue(value, ctx);
    }

    /* Collapse multiple set: handlers into a single onClick */
    if (setHandlers.length > 0) {
        resolved.onClick = () => {
            for (const handler of setHandlers) handler();
        };
    }

    return resolved;
}

/** Converts a bound prop name into the React-style change callback name. */
function toChangeHandlerName(propName: string): string {
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
export function renderNode(
    node: RenderableASTNode,
    registry: RegistryShape,
    ctx: ExecutionContext,
    _runtime?: unknown
): ReactNode {
    if (!node) return null;

    if (Array.isArray(node)) {
        return node.map((child, index) => <Fragment key={index}>{renderNode(child, registry, ctx)}</Fragment>);
    }

    if (node.name === 'text') {
        return node.value ? String(resolveValue(node.value, ctx)) : null;
    }

    if (!resolveCondition(node.params?.if, ctx)) {
        return null;
    }

    const component = registry[node.name];

    if (!component) {
        throw new Error(`Unknown component "${node.name}"`);
    }

    return (
        <RuntimeProvider value={{ node, registry, ctx }}>
            {createElement(
                component,
                { ...resolveParams(node.params, ctx) },
                node.children ? <RuntimeChildren /> : undefined
            )}
        </RuntimeProvider>
    );
}

/**
 * Renders a top-level ASTNode array into a React node.
 * Wraps each root node in a Fragment with a stable index key.
 */
export function render(ast: ASTNode[], registry: RegistryShape, ctx: ExecutionContext): ReactNode {
    return ast.map((node, index) => <Fragment key={index}>{renderNode(node, registry, ctx)}</Fragment>);
}
