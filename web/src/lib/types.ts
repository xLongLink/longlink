import type { Role } from '@/lib/roles';
import type { Accent, Radius, Theme } from '@/lib/theme';

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
    oidc_subject: string | null;
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

export type ApiOrgSummary = {
    name: string;
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

export type ApiDatabaseRegistry = {
    id: number;
    kind: string;
    name: string;
    host: string;
    port: number;
    username: string;
    sslmode: string | null;
    maintenance_database: string;
};

export type ApiStorageRegistry = {
    id: number;
    kind: string;
    name: string;
    protocol: string;
    endpoint_url: string;
    access_key_id: string;
};

export type ApiComputeRegistry = {
    id: number;
    kind: string;
    kube_config_path: string;
    ingress_host: string;
    ingress_name: string;
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
