import type { ExecutionContext } from '../types';

const UNSAFE_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

/** Returns whether a property can be read from XML runtime data. */
export function isSafePropertyName(key: string): boolean {
    return !UNSAFE_PROPERTY_NAMES.has(key);
}

/** Returns whether a value owns a readable XML runtime property. */
export function hasSafeProperty(value: unknown, key: string): boolean {
    return isSafePropertyName(key) && value != null && Object.prototype.hasOwnProperty.call(value, key);
}

/** Reads one own property without traversing prototypes. */
export function readSafeProperty(value: unknown, key: string): unknown {
    return hasSafeProperty(value, key) ? (value as Record<string, unknown>)[key] : undefined;
}

/** Resolves a raw value from the current XML runtime scope chain. */
function resolveRawValue(ctx: ExecutionContext | null | undefined, key: string): unknown {
    if (!isSafePropertyName(key)) return undefined;

    for (let scope = ctx; scope; scope = scope.parent) {
        const values = scope.values ?? {};

        if (hasSafeProperty(values, key)) return readSafeProperty(values, key);

        if (hasSafeProperty(scope, key)) return readSafeProperty(scope, key);
    }

    return undefined;
}

/** Resolves a value from the current XML runtime scope chain. */
export function resolveValue(ctx: ExecutionContext | null | undefined, key: string): unknown {
    if (!ctx) return undefined;

    return resolveRawValue(ctx, key);
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
        current = readSafeProperty(current, part);
    }

    return current;
}
