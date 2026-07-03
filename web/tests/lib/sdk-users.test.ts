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
        expect(SDK_LOCAL_USERS.map((user) => user.role)).toEqual(['read', 'write', 'maintain', 'admin', 'owner']);
        expect(SDK_LOCAL_USERS.map((user) => user.email)).toEqual([
            'read@local.longlink.dev',
            'write@local.longlink.dev',
            'maintain@local.longlink.dev',
            'admin@local.longlink.dev',
            'owner@local.longlink.dev',
        ]);
    });

    it('falls back to the read user for invalid IDs', () => {
        expect(getSdkLocalUser(Number.NaN).role).toBe('read');
        expect(getSdkLocalUser(999).role).toBe('read');
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

        expect(getStoredSdkUserId()).toBe(1);

        storage.set(SDK_USER_STORAGE_KEY, '4');
        expect(getStoredSdkUserId()).toBe(4);

        storeSdkUserId(999);
        expect(storage.get(SDK_USER_STORAGE_KEY)).toBe('1');
    });
});
