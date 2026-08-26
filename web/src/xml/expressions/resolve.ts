import type { Scope } from '../types';

/** Returns whether a property can be read from XML runtime data. */
export function isSafePropertyName(key: string): boolean {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
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
export function resolveValue(scope: Scope, key: string): unknown {
    // Block unsafe top-level scope lookups.
    if (!isSafePropertyName(key)) return undefined;

    // Walk lexical scopes from child to parent.
    for (let currentScope: Scope | undefined = scope; currentScope; currentScope = currentScope.parent) {
        // Read only bindings declared in the lexical scope.
        if (Object.prototype.hasOwnProperty.call(currentScope.bindings, key)) return currentScope.bindings[key];
    }

    return undefined;
}

/** Resolves a dotted or `$` reference path against the current XML runtime scope chain. */
export function resolvePath(scope: Scope, parts: [string, ...string[]]): unknown {
    let current = resolveValue(scope, parts[0]);

    // Walk the remaining path segments directly on the live value.
    for (let index = 1; index < parts.length; index += 1) {
        current = readSafeProperty(current, parts[index]);
        if (current === undefined) return undefined;
    }

    return current;
}
