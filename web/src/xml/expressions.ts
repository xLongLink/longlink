import type { ExecutionContext } from './types';

export type ExpressionResolver<T = unknown> = (ctx: ExecutionContext) => T;


/** Creates a proxy that resolves identifiers through lexical parent contexts. */
function createScopeProxy(ctx: ExecutionContext): Record<string, unknown> {

    /** Resolves a value from the current XML runtime scope chain. */
    function resolve(ctx: ExecutionContext | null | undefined, key: string): unknown {
        if (!ctx) return undefined;
        
        /** Returns the active scope values for the current XML context. */
        const values = ctx.values ?? ctx;

        if (key in values) {
            return values[key];
        }

        return resolve(ctx.parent, key);
    }

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



/** Evaluates an XML attribute value against the current XML runtime scope. */
export function evaluate(expr: string, ctx: ExecutionContext): unknown {
    const input = expr.trim();
    const values = createScopeProxy(ctx);

    /** Runs an expression with XML values exposed as local variables. */
    function run(expression: string, values: Record<string, unknown>): unknown {
        return new Function('ctx', `with (ctx) { return (${expression}); }`)(values);
    }

    if (input === '') return '';

    if (input.startsWith('{') || input.startsWith('[')) {
        try {
            return JSON.parse(input, (_key, value: unknown) => {
                if (typeof value !== 'string') return value;

                const expressionMatch = value.match(/^\{([^{}]+)\}$/);
                if (expressionMatch) return run(expressionMatch[1]!, values);

                return value.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
                    String(run(expression, values) ?? '')
                );
            });
        } catch {
            // JSON attributes may contain string placeholders such as "{issue.title}".
        }

        try {
            const interpolated = input.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
                String(run(expression, values) ?? '')
            );
            return JSON.parse(interpolated);
        } catch {
            // Fall through so malformed JSON can still be handled as a literal string.
        }
    }

    if (input.startsWith('{') && input.endsWith('}')) {
        const expression = input.slice(1, -1).trim();
        const expressionValue = /^[A-Za-z_$][\w$]*\s*:/.test(expression) ? input : expression;

        return run(expressionValue, values);
    }

    if (input.includes('{')) {
        return expr.replace(/\{([^}]+)\}/g, (_match, expression: string) => String(run(expression, values) ?? ''));
    }

    return expr;
}

/** Compiles an XML expression into a function evaluated later with ctx. */
export function compile(expr: string): ExpressionResolver {
    return (ctx) => evaluate(expr, ctx);
}