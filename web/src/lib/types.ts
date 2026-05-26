import type { Accent, Radius, Theme } from '@/lib/theme';
import type { Role } from '@/lib/roles';

export type ApiResponse<T> = {
    success: boolean;
    detail: string;
    data: T | null;
};

export type ApiUserSummary = {
    id: number;
    name: string;
    email: string;
    avatar: string;
    admin: boolean;
};

export type ApiUserOrgMembership = {
    name: string;
    role: Role;
};

export type ApiUserProfile = ApiUserSummary & {
    theme: Theme;
    accent: Accent;
    radius: Radius;
    language: string;
    oidc_subject: string | null;
    orgs: ApiUserOrgMembership[];
};

export type ApiOrgApp = {
    id: number;
    name: string;
    url: string;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary;
    updated_by: ApiUserSummary;
    deleted_at: string | null;
    deleted_by: ApiUserSummary;
};

export type ApiOrgDetails = {
    name: string;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary;
    updated_by: ApiUserSummary;
    deleted_at: string | null;
    deleted_by: ApiUserSummary;
    users: ApiUserSummary[];
    apps: ApiOrgApp[];
};

export type ApiAppResponse = {
    id: number;
    name: string;
    url: string;
    role: Role | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary;
    updated_by: ApiUserSummary;
    deleted_at: string | null;
    deleted_by: ApiUserSummary;
};
