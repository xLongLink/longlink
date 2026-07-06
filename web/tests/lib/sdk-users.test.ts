import {
    SDK_LOCAL_USERS,
    SDK_USER_STORAGE_KEY,
    getSdkLocalUser,
    getStoredSdkUserId,
    storeSdkUserId,
} from '@/lib/sdk-users';
import { afterEach, describe, expect, it } from 'bun:test';

const originalWindow = globalThis.window;

afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
    });
});

describe('SDK local users', () => {
    it('provides deterministic users for every local permission role', () => {
        expect(new Set(SDK_LOCAL_USERS.map((user) => user.role))).toEqual(
            new Set(['read', 'write', 'maintain', 'admin', 'owner'])
        );
    });

    it('falls back to the read user for invalid IDs', () => {
        expect(getSdkLocalUser('not-a-user').role).toBe('read');
        expect(getSdkLocalUser('999').role).toBe('read');
    });

    it('normalizes browser storage reads and writes', () => {
        const storage = new Map<string, string>();
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: {
                localStorage: {
                    getItem: (key: string) => storage.get(key) ?? null,
                    setItem: (key: string, value: string) => storage.set(key, value),
                },
            },
        });

        expect(getStoredSdkUserId()).toBe('00000000-0000-0000-0000-000000000001');

        storage.set(SDK_USER_STORAGE_KEY, '00000000-0000-0000-0000-000000000004');
        expect(getStoredSdkUserId()).toBe('00000000-0000-0000-0000-000000000004');

        storage.set(SDK_USER_STORAGE_KEY, '4');
        expect(getStoredSdkUserId()).toBe('00000000-0000-0000-0000-000000000004');

        storeSdkUserId('999');
        expect(storage.get(SDK_USER_STORAGE_KEY)).toBe('00000000-0000-0000-0000-000000000001');
    });
});
