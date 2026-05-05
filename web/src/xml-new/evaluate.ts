import type { XmlContext } from './types';

const SIMPLE_EXPR_REGEX = /^[a-zA-Z0-9_.$\s+\-/*%!=<>|&(),?:'"\[\]]+$/;

function run(expr: string, ctx: Record<string, any>) {
    return new Function('ctx', `with (ctx) { return (${expr}); }`)(ctx);
}

export function evaluate(value: string, context: XmlContext): unknown {
    const input = value.trim();
    if (input === '') return '';

    const ctx = { ...context.store, ...context.scope };

    // 1. Pure number
    const numeric = Number(input);
    if (!Number.isNaN(numeric) && String(numeric) === input) {
        return numeric;
    }

    // 2. Template string with {expressions}
    if (input.includes('{')) {
        const result = input.replace(/\{([^}]+)\}/g, (_, expr) => {
            try {
                const evaluated = run(expr, ctx);
                return evaluated ?? '';
            } catch {
                return '';
            }
        });

        // If the whole string was a single expression → return raw value
        if (/^\{[^}]+\}$/.test(input)) {
            return run(input.slice(1, -1), ctx);
        }

        return result;
    }

    // 3. Simple expression (no {})
    if (SIMPLE_EXPR_REGEX.test(input)) {
        try {
            return run(input, ctx);
        } catch {
            return value;
        }
    }

    // 4. Fallback: raw string
    return value;
}
