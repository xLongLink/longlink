import { createContext, useContext as useReactContext, type ReactNode } from 'react';
import type { ExecutionContext } from './types';

export const BaseUrlContext = createContext<string>('');
export const RuntimeContext = createContext<ExecutionContext | null>(null);

/** Evaluates an XML attribute value against the current flat XML context. */
export function evaluate(expr: string, values: ExecutionContext): unknown {
    const input = expr.trim();

    if (input === '') return '';

    if (input.startsWith('$')) {
        const target = input.slice(1).trim();
        const value = target.split('.').reduce<unknown>((current, segment) => {
            if (current == null || typeof current !== 'object') return undefined;

            return (current as Record<string, unknown>)[segment];
        }, values);

        if (value === undefined) {
            const stateKey = target.includes('.') ? target.slice(0, target.indexOf('.')) : target;

            if (!stateKey || values[stateKey] == null) {
                throw new Error(`Unknown state "${stateKey}"`);
            }
        }

        return value;
    }

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
