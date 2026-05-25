export const ROLE_NAMES = ['read', 'write', 'maintain', 'admin', 'owner'] as const;

export type Role = (typeof ROLE_NAMES)[number];
