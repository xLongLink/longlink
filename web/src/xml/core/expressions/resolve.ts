import { getVersion, snapshot } from 'valtio';

import type { ExecutionContext } from '@xml/types';

/** Resolves a value from the current XML runtime scope chain. */
export function resolveValue(ctx: ExecutionContext | null | undefined, key: string): unknown {
    if (!ctx) return undefined;

    /* Resolve against nested `values` first, then the flat context object. */
    const values = ctx.values ?? {};

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

    if (key in ctx) {
        return (ctx as Record<string, unknown>)[key];
    }

    return resolveValue(ctx.parent, key);
}

/** Creates a proxy that resolves identifiers through lexical parent contexts. */
export function createScopeProxy(ctx: ExecutionContext): Record<string, unknown> {
    return new Proxy(
        {},
        {
            has(_target, key) {
                /* Allow `with` lookups to flow through the scope chain instead of falling back to globals. */
                return typeof key === 'string';
            },
            get(_target, key) {
                return typeof key === 'string' ? resolveValue(ctx, key) : undefined;
            },
        }
    );
}

/** Resolves a dotted or `$` reference path against the current XML runtime scope chain. */
export function resolvePath(ctx: ExecutionContext, parts: string[]): unknown {
    if (parts.length === 0) return undefined;

    let current: unknown = undefined;

    /* Find the root symbol in the current scope chain first. */
    for (let scope: ExecutionContext | null | undefined = ctx; scope; scope = scope.parent) {
        const values = scope.values ?? {};

        if (parts[0] in values) {
            current = values[parts[0]];
            break;
        }

        if (parts[0] in scope) {
            current = (scope as Record<string, unknown>)[parts[0]];
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
