import type { Role } from '@/lib/roles';

export type SdkLocalUser = {
    id: string;
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
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Read User',
        role: 'read',
        email: 'read@local.longlink.dev',
        avatar: '',
        permission: 'read',
        permissions: ['read'],
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Write User',
        role: 'write',
        email: 'write@local.longlink.dev',
        avatar: '',
        permission: 'write',
        permissions: ['write'],
    },
    {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Maintain User',
        role: 'maintain',
        email: 'maintain@local.longlink.dev',
        avatar: '',
        permission: 'maintain',
        permissions: ['maintain'],
    },
    {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@local.longlink.dev',
        avatar: '',
        permission: 'admin',
        permissions: ['admin'],
    },
    {
        id: '00000000-0000-0000-0000-000000000005',
        name: 'Owner User',
        role: 'owner',
        email: 'owner@local.longlink.dev',
        avatar: '',
        permission: 'owner',
        permissions: ['owner'],
    },
];

/** Returns the SDK local user for a persisted ID, falling back to the read-only user. */
export function getSdkLocalUser(userId: string | null | undefined): SdkLocalUser {
    const normalizedUserId = userId?.trim() ?? '';

    if (/^[1-5]$/.test(normalizedUserId)) {
        return SDK_LOCAL_USERS[Number.parseInt(normalizedUserId, 10) - 1];
    }

    return SDK_LOCAL_USERS.find((user) => user.id === normalizedUserId) ?? SDK_LOCAL_USERS[0];
}

/** Reads the selected SDK local user ID from browser storage. */
export function getStoredSdkUserId(): string {
    if (typeof window === 'undefined') {
        return SDK_LOCAL_USERS[0].id;
    }

    return getSdkLocalUser(window.localStorage.getItem(SDK_USER_STORAGE_KEY)).id;
}

/** Persists the selected SDK local user ID in browser storage. */
export function storeSdkUserId(userId: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(SDK_USER_STORAGE_KEY, getSdkLocalUser(userId).id);
}
