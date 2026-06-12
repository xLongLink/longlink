export const ROLE_NAMES = ['read', 'write', 'maintain', 'admin', 'owner'] as const;

export type Role = (typeof ROLE_NAMES)[number];

export const PLATFORM_ROLE_NAMES = ['user', 'support', 'administrator'] as const;

export type PlatformRole = (typeof PLATFORM_ROLE_NAMES)[number];
