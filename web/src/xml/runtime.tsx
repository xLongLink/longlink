import { createContext, useContext as useReactContext, type ReactNode } from 'react';
import { renderNode } from './renderers';
import type { ExecutionContext, RuntimeState } from './types';

/**
 * Evaluates a string against the current execution context.
 *
 * The scope exposed to expressions is built by merging (in priority order):
 *   1. state  — current values of all reactive state variables (first element of each [value, setter] tuple)
 *   2. queries — results of data queries
 *   3. scope  — locally scoped variables (e.g. loop iteration variables); highest priority
 *
 * Plain literals are returned as strings, numbers, booleans, null, or
 * JSON values when they can be parsed safely.
 * Full `{expression}` blocks are evaluated and returned.
 * Throws a ReferenceError if the expression references an unknown variable.
 * Throws a SyntaxError if the expression string is not valid JavaScript.
 */
export function evaluate(expr: string, ctx: ExecutionContext): unknown;
export function evaluate(expr: string, ctx: ExecutionContext, type: 'string'): string;
export function evaluate(expr: string, ctx: ExecutionContext, type: 'number'): number;
export function evaluate(expr: string, ctx: ExecutionContext, type: 'boolean'): boolean;
export function evaluate(expr: string, ctx: ExecutionContext, type?: 'string' | 'number' | 'boolean'): unknown {
    const trimmedExpr = expr.trim();
    const scope = buildScope(ctx);

    if (!trimmedExpr.startsWith('{') || !trimmedExpr.endsWith('}')) {
        return coerceLiteral(expr, type);
    }

    const expression = trimmedExpr.slice(1, -1).trim();

    if (!expression) {
        return coerceValue('', type);
    }

    try {
        return coerceValue(new Function(...Object.keys(scope), `return ${expression}`)(...Object.values(scope)), type);
    } catch (error) {
        if (!(error instanceof SyntaxError)) {
            throw error;
        }
    }

    /* Re-wrap in parens so `{key: value}` is parsed as an object literal, not a labeled statement. */
    return coerceValue(new Function(...Object.keys(scope), `return (${expression})`)(...Object.values(scope)), type);
}

/** Builds the execution scope from state, queries, and local variables. */
function buildScope(ctx: ExecutionContext): Record<string, unknown> {
    return {
        ...Object.fromEntries(Object.entries(ctx.state).map(([key, [value]]) => [key, value])),
        ...ctx.queries,
        ...ctx.scope,
    };
}

/** Coerces a literal string into the requested type or inferred runtime value. */
function coerceLiteral(value: string, type?: 'string' | 'number' | 'boolean'): unknown {
    if (type == null) {
        return inferLiteral(value);
    }

    if (type === 'number') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
    }

    if (type === 'boolean') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }

    return value;
}

/** Infers the most useful runtime value from a raw XML attribute string. */
function inferLiteral(value: string): unknown {
    const trimmed = value.trim();

    if (trimmed === '') return '';
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) return numericValue;

    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    return value;
}

/** Coerces an evaluated value into the requested type. */
function coerceValue(value: unknown, type?: 'string' | 'number' | 'boolean'): unknown {
    if (type === 'string') return String(value);
    if (type === 'number') return typeof value === 'number' ? value : Number(value);
    if (type === 'boolean') return Boolean(value);
    return value;
}

/**
 * Resolves a condition string to a boolean for use in `if` attributes.
 *
 * If condition is null or undefined, the element is always rendered (returns true).
 */
export function resolveCondition(condition: string | undefined, ctx: ExecutionContext): boolean {
    if (condition == null) return true;

    return Boolean(evaluate(condition, ctx, 'boolean'));
}

/**
 * Resolves a `$` target into a current value and setter.
 *
 * The target uses a dot-separated state path. The first segment identifies
 * the state container and the remaining segments identify the value inside
 * that state object.
 */
export function resolveBind(
    target: string,
    ctx: ExecutionContext
): { value: unknown; setValue: (value: unknown) => void } {
    const dotIndex = target.indexOf('.');
    const stateKey = dotIndex === -1 ? target : target.slice(0, dotIndex);
    const propPath = dotIndex === -1 ? [] : target.slice(dotIndex + 1).split('.');

    const stateEntry = ctx.state[stateKey];

    if (!stateEntry) {
        throw new Error(`$ unknown state "${stateKey}"`);
    }

    const [stateValue, setter] = stateEntry;

    return {
        value: getDeep(stateValue, propPath),
        setValue: (newValue: unknown) => {
            if (propPath.length === 0) {
                setter(newValue);
                return;
            }

            /* Use a functional setter so rapid bound updates compose safely. */
            setter((previous: unknown) => setDeep(previous, propPath, newValue));
        },
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

/** Reads a nested property from an object following a path array. */
function getDeep(obj: unknown, path: string[]): unknown {
    let current = obj;

    for (const segment of path) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return current;
}

export const RuntimeContext = createContext<RuntimeState | null>(null);

export function RuntimeProvider({ value, children }: { value: RuntimeState; children: ReactNode }) {
    return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useContext(): RuntimeState {
    const runtime = useReactContext(RuntimeContext);

    if (!runtime) {
        throw new Error('useRuntime must be used inside a rendered ReactXML component');
    }

    return runtime;
}

export function RuntimeChildren() {
    const { ctx, children } = useContext();

    return renderNode(children, ctx);
}
