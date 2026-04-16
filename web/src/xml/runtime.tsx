import { createContext, useContext, type ReactNode } from 'react';
import { renderNode } from './renderers';
import type { ExecutionContext, RuntimeState } from './types';

/**
 * Evaluates a JavaScript expression string against the current execution context.
 *
 * The scope exposed to the expression is built by merging (in priority order):
 *   1. state  — current values of all reactive state variables (first element of each [value, setter] tuple)
 *   2. queries — results of data queries
 *   3. scope  — locally scoped variables (e.g. loop iteration variables); highest priority
 *
 * Throws a ReferenceError if the expression references an unknown variable.
 * Throws a SyntaxError if the expression string is not valid JavaScript.
 */
export function evaluate(expr: string, ctx: ExecutionContext): any {
    /* Build scope: state values, then queries, then local scope (highest priority) */
    const scope = {
        ...Object.fromEntries(Object.entries(ctx.state).map(([key, [value]]) => [key, value])),
        ...ctx.queries,
        ...ctx.scope,
    };

    return new Function(...Object.keys(scope), `return ${expr}`)(...Object.values(scope));
}

/**
 * Replaces all `{expression}` placeholders in a string with their evaluated values.
 *
 * Each `{...}` block is evaluated as a JavaScript expression against the current context.
 * The result is coerced to a string and substituted in place.
 *
 * Throws if any embedded expression is invalid or references an unknown variable.
 *
 * Example: interpolate("Hello {name}!", ctx) → "Hello World!"
 */
export function interpolate(str: string, ctx: ExecutionContext): string {
    return str.replace(/\{([^}]+)\}/g, (_, expr) => String(evaluate(expr, ctx)));
}

/**
 * Resolves an attribute value string against the current execution context.
 *
 * - If the value is NOT wrapped in `{...}`, it is treated as a template string and all
 *   `{expr}` placeholders within it are interpolated (see interpolate).
 *
 * - If the value IS a single `{expression}` block, the inner expression is evaluated directly.
 *   This is the primary path for passing non-string values (numbers, booleans, arrays, objects).
 *
 * - If the direct evaluation throws a SyntaxError (e.g. `{key: value}` is ambiguous as a
 *   labeled statement), the value is re-evaluated wrapped in parentheses `({key: value})`
 *   so it is parsed as an object literal instead.
 */
export function resolveValue(value: string, ctx: ExecutionContext): unknown {
    if (!value.startsWith('{') || !value.endsWith('}')) {
        return interpolate(value, ctx);
    }

    const expression = value.slice(1, -1).trim();

    try {
        return evaluate(expression, ctx);
    } catch (error) {
        if (!(error instanceof SyntaxError)) {
            throw error;
        }
    }

    // Re-wrap in parens so `{key: value}` is parsed as an object literal, not a labeled statement.
    return evaluate(`(${value})`, ctx);
}

/**
 * Resolves a condition string to a boolean for use in `if` attributes.
 *
 * - If condition is null or undefined, the element is always rendered (returns true).
 * - If condition is an empty or whitespace-only string, returns false.
 * - If condition is a `{expression}` block, it is resolved via resolveValue and coerced to boolean.
 * - Otherwise the string is evaluated directly as a JS expression.
 *
 * Example: resolveCondition("{count > 0}", ctx) → true when count is 5
 */
export function resolveCondition(condition: string | undefined, ctx: ExecutionContext): boolean {
    if (condition == null) return true;

    const trimmed = condition.trim();

    if (!trimmed) return false;

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return Boolean(resolveValue(trimmed, ctx));
    }

    return Boolean(evaluate(trimmed, ctx));
}

/**
 * Produces a click handler for a `set:<target>` attribute.
 *
 * The `target` is a dot-separated path where the first segment identifies a
 * reactive state variable and the remaining segments describe a property path
 * within that state's value object.
 *
 * Examples:
 *   resolveSet("filter.value", "'week'", ctx)
 *     → calls ctx.state["filter"][1]({ ...current, value: "week" })
 *
 *   resolveSet("filter", "'week'", ctx)
 *     → calls ctx.state["filter"][1]("week")  (replaces the whole value)
 *
 * Throws if the first segment does not match a known state key.
 */
export function resolveSet(target: string, valueExpr: string, ctx: ExecutionContext): () => void {
    /* Parse dot-separated target into state key and property path */
    const dotIndex = target.indexOf('.');
    const stateKey = dotIndex === -1 ? target : target.slice(0, dotIndex);
    const propPath = dotIndex === -1 ? [] : target.slice(dotIndex + 1).split('.');

    const stateEntry = ctx.state[stateKey];

    if (!stateEntry) {
        throw new Error(`set: unknown state "${stateKey}"`);
    }

    /* Return a closure that evaluates the expression and writes to state */
    return () => {
        const [current, setter] = stateEntry;
        const newValue = evaluate(valueExpr, ctx);
        setter(propPath.length === 0 ? newValue : setDeep(current, propPath, newValue));
    };
}

/**
 * Recursively sets a nested property on an object following a path array.
 * Returns a new object with the deep property updated, preserving immutability.
 */
function setDeep(obj: any, path: string[], value: any): any {
    if (path.length === 0) return value;
    const head: string = path[0]!;
    const tail = path.slice(1);
    return { ...obj, [head]: setDeep(obj?.[head], tail, value) };
}

// ---------------------------------------------------------------------------
// useRuntime / RuntimeProvider / RuntimeChildren
// ---------------------------------------------------------------------------

const RuntimeContext = createContext<RuntimeState | null>(null);

export function RuntimeProvider({ value, children }: { value: RuntimeState; children: ReactNode }) {
    return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeState {
    const runtime = useContext(RuntimeContext);

    if (!runtime) {
        throw new Error('useRuntime must be used inside a rendered ReactXML component');
    }

    return runtime;
}

export function RuntimeChildren() {
    const { node, registry, ctx } = useRuntime();

    return renderNode(node.children, registry, ctx);
}
