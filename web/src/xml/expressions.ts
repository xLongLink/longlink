import type { ExecutionContext, XmlSourceContext } from './types';

export type ExpressionResolver<T = unknown> = (ctx: ExecutionContext) => T;

class XmlExpressionError extends Error {
    constructor(message: string, cause: unknown) {
        super(message);
        this.name = 'XmlExpressionError';
        if (cause instanceof Error) {
            this.stack = `${this.name}: ${this.message}\nCaused by: ${cause.stack ?? cause.message}`;
        }
    }
}

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
export function evaluate(expr: string, ctx: ExecutionContext, source?: XmlSourceContext): unknown {
    const input = expr.trim();
    const values = createScopeProxy(ctx);

    /** Runs an expression with XML values exposed as local variables. */
    function run(expression: string, values: Record<string, unknown>): unknown {
        try {
            return new Function('ctx', `with (ctx) { return (${expression}); }`)(values);
        } catch (error) {
            const location = source?.nodeName
                ? `<${source.nodeName}>${source.attributeName ? ` attribute "${source.attributeName}"` : ''}`
                : 'XML expression';
            throw new XmlExpressionError(
                `${location}: ${error instanceof Error ? error.message : 'Expression evaluation failed'}`,
                error
            );
        }
    }

    if (input === '') return '';

    /* Treat `{{ ... }}` as a declarative object or JSON-like expression. */
    if (input.startsWith('{{') && input.endsWith('}}')) {
        return run(input.slice(2, -2).trim(), values);
    }

    /* Interpolate single-brace expressions inside plain text values. */
    if (input.includes('{')) {
        return expr.replace(/\{([^{}]+)\}/g, (_match, expression: string) => String(run(expression, values) ?? ''));
    }

    return expr;
}

/** Compiles an XML expression into a function evaluated later with ctx. */
export function compile(expr: string): ExpressionResolver {
    return (ctx) => evaluate(expr, ctx);
}
