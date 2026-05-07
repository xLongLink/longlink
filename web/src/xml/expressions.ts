import type { ExecutionContext } from './types';

export type ExpressionResolver<T = unknown> = (ctx: ExecutionContext) => T;

/** Resolves a value from the current XML runtime scope chain. */
export function resolve(ctx: ExecutionContext | null | undefined, key: string): unknown {
    if (!ctx) return undefined;

    if (key in ctx.values) {
        return ctx.values[key];
    }

    return resolve(ctx.parent, key);
}

/** Evaluates an XML attribute value against the current XML runtime scope. */
export function evaluate(expr: string, ctx: ExecutionContext): unknown {
    const input = expr.trim();
    const values = createScopeProxy(ctx);

    if (input === '') return '';

    if (input.startsWith('{') || input.startsWith('[')) {
        try {
            return JSON.parse(input, (_key, value: unknown) => {
                if (typeof value !== 'string') return value;

                const expressionMatch = value.match(/^\{([^{}]+)\}$/);
                if (expressionMatch) return runExpression(expressionMatch[1]!, values);

                return value.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
                    String(runExpression(expression, values) ?? '')
                );
            });
        } catch {
            // JSON attributes may contain string placeholders such as "{issue.title}".
        }

        try {
            const interpolated = input.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
                String(runExpression(expression, values) ?? '')
            );
            return JSON.parse(interpolated);
        } catch {
            // Fall through so malformed JSON can still be handled as a literal string.
        }
    }

    if (input.startsWith('{') && input.endsWith('}')) {
        const expression = input.slice(1, -1).trim();
        const expressionValue = /^[A-Za-z_$][\w$]*\s*:/.test(expression) ? input : expression;

        return runExpression(expressionValue, values);
    }

    if (input.includes('{')) {
        return expr.replace(/\{([^}]+)\}/g, (_match, expression: string) =>
            String(runExpression(expression, values) ?? '')
        );
    }

    return expr;
}

/** Compiles an XML expression into a function evaluated later with ctx. */
export function compile(expr: string): ExpressionResolver {
    return (ctx) => evaluate(expr, ctx);
}

/** Resolves a props object immediately, compiling selected lazy values into functions. */
export function resolveProps(
    props: Record<string, string>,
    ctx: ExecutionContext,
    lazyKeys: string[] = []
): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
        resolved[key] = lazyKeys.includes(key) ? compile(value) : evaluate(value, ctx);
    }

    return resolved;
}

/** Runs an expression with XML values exposed as local variables. */
function runExpression(expression: string, values: Record<string, unknown>): unknown {
    return new Function('ctx', `with (ctx) { return (${expression}); }`)(values);
}

/** Creates a proxy that resolves identifiers through lexical parent contexts. */
function createScopeProxy(ctx: ExecutionContext): Record<string, unknown> {
    return new Proxy(
        {},
        {
            has(_target, key) {
                return typeof key === 'string' ? resolve(ctx, key) !== undefined : false;
            },
            get(_target, key) {
                return typeof key === 'string' ? resolve(ctx, key) : undefined;
            },
        }
    );
}
