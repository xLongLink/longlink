import { getVersion } from 'valtio';
import { isSafePropertyName } from '../expressions/resolve';

/** Returns whether a value is a mutable Valtio proxy. */
export function isValtioProxy(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && getVersion(value) !== undefined;
}

/** Applies an object patch to properties declared by a Valtio State. */
export function applyDeclaredStatePatch(target: Record<string, unknown>, patch: object, adapter: string): void {
    for (const [key, entry] of Object.entries(patch)) {
        if (!isSafePropertyName(key) || !Object.hasOwn(target, key)) {
            throw new Error(`${adapter} cannot update undeclared State property "${key}"`);
        }

        target[key] = entry;
    }
}
