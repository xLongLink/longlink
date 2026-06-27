import type { Role } from '@/lib/roles';

export type SdkLocalUser = {
    id: number;
    name: string;
    role: Role;
    email: string;
    avatar: string;
    permission: Role;
    permissions: Role[];
};

export const SDK_USER_STORAGE_KEY = 'longlink.sdk.userId';

export const SDK_LOCAL_USERS: readonly SdkLocalUser[] = [
    {
        id: 1,
        name: 'Read User',
        role: 'read',
        email: 'read@local.longlink.dev',
        avatar: '',
        permission: 'read',
        permissions: ['read'],
    },
    {
        id: 2,
        name: 'Write User',
        role: 'write',
        email: 'write@local.longlink.dev',
        avatar: '',
        permission: 'write',
        permissions: ['write'],
    },
    {
        id: 3,
        name: 'Maintain User',
        role: 'maintain',
        email: 'maintain@local.longlink.dev',
        avatar: '',
        permission: 'maintain',
        permissions: ['maintain'],
    },
    {
        id: 4,
        name: 'Admin User',
        role: 'admin',
        email: 'admin@local.longlink.dev',
        avatar: '',
        permission: 'admin',
        permissions: ['admin'],
    },
    {
        id: 5,
        name: 'Owner User',
        role: 'owner',
        email: 'owner@local.longlink.dev',
        avatar: '',
        permission: 'owner',
        permissions: ['owner'],
    },
];

/** Returns the SDK local user for a persisted ID, falling back to the read-only user. */
export function getSdkLocalUser(userId: number): SdkLocalUser {
    return SDK_LOCAL_USERS.find((user) => user.id === userId) ?? SDK_LOCAL_USERS[0];
}

/** Reads the selected SDK local user ID from browser storage. */
export function getStoredSdkUserId(): number {
    if (typeof window === 'undefined') {
        return SDK_LOCAL_USERS[0].id;
    }

    const storedUserId = Number.parseInt(window.localStorage.getItem(SDK_USER_STORAGE_KEY) ?? '', 10);

    return getSdkLocalUser(storedUserId).id;
}

/** Persists the selected SDK local user ID in browser storage. */
export function storeSdkUserId(userId: number): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(SDK_USER_STORAGE_KEY, String(getSdkLocalUser(userId).id));
}
