import { getVersion } from 'valtio';

/** Returns whether a value is a mutable Valtio proxy. */
export function isValtioProxy(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && getVersion(value) !== undefined;
}
