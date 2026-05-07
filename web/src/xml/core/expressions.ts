import type { ExecutionContext } from '@xml/types';
import { getVersion, snapshot } from 'valtio';


export type ExpressionResolver<T = unknown> = (ctx: ExecutionContext) => T;


/** Returns true when the input is wrapped in braces. */
export function isExpression(expr: string): boolean {
    const input = expr.trim();

    return input.startsWith('{') && input.endsWith('}');
}


/** Returns true when the input is a `$`-prefixed reference path. */
export function isReference(expr: string): boolean {
    const input = expr.trim();

    return /^\$[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(input);
}


/** Returns true when the input is a simple text string. */
export function isText(expr: string): boolean {
    const input = expr.trim();

    return input === '' || (!isExpression(input) && !isReference(input));
}


/** Creates a proxy that resolves identifiers through lexical parent contexts. */
function createScopeProxy(ctx: ExecutionContext): Record<string, unknown> {
    /** Resolves a value from the current XML runtime scope chain. */
    function resolve(ctx: ExecutionContext | null | undefined, key: string): unknown {
        if (!ctx) return undefined;

        /** Returns the active scope values for the current XML context. */
        const values = ctx.values ?? ctx;

        if (key in values) {
            const value = values[key];

            /* Unwrap scalar Valtio state objects like `{ value: "Ada" }` to plain values. */
            if (value && typeof value === 'object' && getVersion(value) !== undefined) {
                const data = snapshot(value as object) as Record<string, unknown>;

                if (Object.keys(data).length === 1 && 'value' in data) {
                    return data.value;
                }
            }

            return value;
        }

        return resolve(ctx.parent, key);
    }

    return new Proxy(
        {},
        {
            has(_target, key) {
                /* Allow `with` lookups to flow through the scope chain instead of falling back to globals. */
                return typeof key === 'string';
            },
            get(_target, key) {
                return typeof key === 'string' ? resolve(ctx, key) : undefined;
            },
        }
    );
}

/** Evaluates an XML attribute value against the current XML runtime scope. */
export function evaluate(expr: string, ctx: ExecutionContext): unknown {
    const input = expr.trim();
    const values = createScopeProxy(ctx);

    /** Runs an expression with XML values exposed as local variables. */
    function run(expression: string, values: Record<string, unknown>): unknown {
        try {
            return new Function('ctx', `with (ctx) { return (${expression}); }`)(values);
        } catch (error) {
            throw error;
        }
    }

    if (input === '') return '';

    /* Treat `{ ... }` and `{{ ... }}` as expressions. */
    if (isExpression(input)) {
        const inner = input.startsWith('{{') ? input.slice(2, -2).trim() : input.slice(1, -1).trim();
        try {
            return run(input.startsWith('{{') ? `({ ${inner} })` : inner, values);
        } catch (error) {
            if (input.startsWith('{{') && error instanceof SyntaxError) {
                throw new Error(
                    `Invalid object expression "${expr}": use key/value pairs inside double braces, for example "{{ fullName: fullName }}" or shorthand "{{ fullName }}".`
                );
            }

            throw error;
        }
    }

    /* Resolve `$` references directly through the runtime scope. */
    if (isReference(input)) {
        const parts = input.slice(1).split('.').filter(Boolean);

        if (parts.length === 0) return undefined;

        let current: unknown = undefined;

        /* Find the root symbol in the current scope chain first. */
        for (let scope: ExecutionContext | null | undefined = ctx; scope; scope = scope.parent) {
            const values = scope.values ?? scope;

            if (parts[0] in values) {
                current = values[parts[0]];
                break;
            }
        }

        /* Walk the remaining path segments directly on the live value. */
        for (const part of parts.slice(1)) {
            if (current == null) return undefined;
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    /* Interpolate single-brace expressions inside plain text values. */
    if (!isText(input) && input.includes('{')) {
        return expr.replace(/\{([^{}]+)\}/g, (_match, expression: string) => String(run(expression, values) ?? ''));
    }

    return expr;
}

/** Compiles an XML expression into a function evaluated later with ctx. */
export function compile(expr: string): ExpressionResolver {
    return (ctx) => evaluate(expr, ctx);
}
