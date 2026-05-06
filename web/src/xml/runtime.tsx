import { createContext, useContext as useReactContext, type ReactNode } from 'react';
import type { ExecutionContext } from './types';

export const BaseUrlContext = createContext<string>('');
export const RuntimeContext = createContext<ExecutionContext | null>(null);

/** Evaluates an XML attribute value against the current flat XML context. */
export function evaluate(expr: string, values: ExecutionContext): unknown {
    const input = expr.trim();

    if (input === '') return '';

    if (input.startsWith('$')) {
        return readPath(values, input.slice(1).trim());
    }

    if (input.startsWith('[') || input.startsWith('{"')) {
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

    return inferLiteral(expr);
}

/** Resolves an XML `if` attribute to a render decision. */
export function resolveCondition(condition: string | undefined, ctx: ExecutionContext): boolean {
    if (condition == null) return true;

    return Boolean(evaluate(condition, ctx));
}

/** Resolves a $ target into its current value. */
export function resolveBinding(target: string, ctx: ExecutionContext): unknown {
    const normalized = target.trim();
    const dotIndex = normalized.indexOf('.');
    const stateKey = dotIndex === -1 ? normalized : normalized.slice(0, dotIndex);

    if (!stateKey || ctx[stateKey] == null) {
        throw new Error(`Unknown state "${stateKey}"`);
    }

    return readPath(ctx, normalized);
}

/** Provides XML value context to a rendered subtree. */
export function RuntimeProvider({ value, children }: { value: ExecutionContext; children: ReactNode }) {
    return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

/** Returns the active XML runtime state. */
export function useContext(): { ctx: ExecutionContext; baseUrl: string } {
    const runtime = useReactContext(RuntimeContext);
    const baseUrl = useReactContext(BaseUrlContext);

    if (!runtime) {
        throw new Error('useContext must be used inside a rendered XML component');
    }

    return { ctx: runtime, baseUrl };
}

/** Runs an expression with XML values exposed as local variables. */
function runExpression(expression: string, values: ExecutionContext): unknown {
    return new Function('ctx', `with (ctx) { return (${expression}); }`)(values);
}

/** Infers primitive values from literal XML attribute text. */
function inferLiteral(value: string): unknown {
    const input = value.trim();

    if (input === '') return '';
    if (input === 'null') return null;
    if (input === 'undefined') return undefined;
    if (input === 'true') return true;
    if (input === 'false') return false;

    const numberValue = Number(input);
    if (Number.isFinite(numberValue) && String(numberValue) === input) return numberValue;

    if ((input.startsWith('{') && input.endsWith('}')) || (input.startsWith('[') && input.endsWith(']'))) {
        try {
            return JSON.parse(input);
        } catch {
            return value;
        }
    }

    return value;
}

/** Reads a dotted path from the flat XML context. */
function readPath(values: ExecutionContext, path: string): unknown {
    if (!path) return undefined;

    return path.split('.').reduce<unknown>((current, segment) => {
        if (current == null || typeof current !== 'object') return undefined;

        return (current as Record<string, unknown>)[segment];
    }, values);
}
