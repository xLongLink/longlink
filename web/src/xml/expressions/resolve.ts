import { getVersion, snapshot } from 'valtio';

import type { ExecutionContext } from '../types';

/** Resolves a raw value from the current XML runtime scope chain. */
function resolveRawValue(ctx: ExecutionContext | null | undefined, key: string): unknown {
    for (let scope = ctx; scope; scope = scope.parent) {
        const values = scope.values ?? {};

        if (key in values) return values[key];

        if (key in scope) return (scope as Record<string, unknown>)[key];
    }

    return undefined;
}

/** Unwraps scalar Valtio state objects into plain values when possible. */
function unwrapValue(value: unknown): unknown {
    if (!value || typeof value !== 'object' || getVersion(value) === undefined) return value;

    const data = snapshot(value as object) as Record<string, unknown>;

    if (Object.keys(data).length === 1 && 'value' in data) {
        return data.value;
    }

    return value;
}

/** Resolves a value from the current XML runtime scope chain. */
export function resolveValue(ctx: ExecutionContext | null | undefined, key: string): unknown {
    if (!ctx) return undefined;

    return unwrapValue(resolveRawValue(ctx, key));
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

    let current = resolveRawValue(ctx, parts[0]);

    // Walk the remaining path segments directly on the live value.
    for (const part of parts.slice(1)) {
        if (current == null) return undefined;

        current = (current as Record<string, unknown>)[part];
    }

    return current;
}
