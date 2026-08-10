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

/** Resolves a value from the current XML runtime scope chain. */
export function resolveValue(ctx: ExecutionContext | null | undefined, key: string): unknown {
    // Block unsafe top-level scope lookups.
    if (!isSafePropertyName(key)) return undefined;

    // Walk lexical scopes from child to parent.
    for (let scope = ctx; scope; scope = scope.parent) {
        const values = scope.values;

        // Prefer values stored in the scope.
        if (hasSafeProperty(values, key)) return readSafeProperty(values, key);

        // Fall back to direct scope properties.
        if (hasSafeProperty(scope, key)) return readSafeProperty(scope, key);
    }

    return undefined;
}

/** Resolves a dotted or `$` reference path against the current XML runtime scope chain. */
export function resolvePath(ctx: ExecutionContext, parts: string[]): unknown {
    // Empty paths do not resolve to a value.
    if (parts.length === 0) return undefined;

    let current = resolveValue(ctx, parts[0]);

    // Walk the remaining path segments directly on the live value.
    for (const part of parts.slice(1)) {
        current = readSafeProperty(current, part);
    }

    return current;
}
