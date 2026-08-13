import type { Scope } from '../types';

const UNSAFE_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

/** Returns whether a property can be read from XML runtime data. */
export function isSafePropertyName(key: string): boolean {
    return !UNSAFE_PROPERTY_NAMES.has(key);
}

/** Reads one own property without traversing prototypes. */
export function readSafeProperty<T extends Record<string, unknown>>(value: T, key: string): T[string] | undefined;
export function readSafeProperty(value: unknown, key: string): unknown;
export function readSafeProperty(value: unknown, key: string): unknown {
    return isSafePropertyName(key) && value != null && Object.prototype.hasOwnProperty.call(value, key)
        ? (value as Record<string, unknown>)[key]
        : undefined;
}

/** Resolves a value from the current XML runtime scope chain. */
export function resolveValue(scope: Scope | null | undefined, key: string): unknown {
    // Block unsafe top-level scope lookups.
    if (!isSafePropertyName(key)) return undefined;

    // Walk lexical scopes from child to parent.
    for (let currentScope = scope; currentScope; currentScope = currentScope.parent) {
        const bindings = currentScope.bindings;

        // Read only bindings declared in the lexical scope.
        if (Object.prototype.hasOwnProperty.call(bindings, key)) return bindings[key];
    }

    return undefined;
}

/** Resolves a dotted or `$` reference path against the current XML runtime scope chain. */
export function resolvePath(scope: Scope, parts: string[]): unknown {
    // Empty paths do not resolve to a value.
    if (parts.length === 0) return undefined;

    let current = resolveValue(scope, parts[0]);

    // Walk the remaining path segments directly on the live value.
    for (let index = 1; index < parts.length; index += 1) {
        current = readSafeProperty(current, parts[index]);
    }

    return current;
}
