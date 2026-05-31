import type { Role } from '@/lib/roles';
import type { Accent, Radius, Theme } from '@/lib/theme';

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
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiOrgSummary = {
    name: string;
    location_id: number | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiOrgDetails = {
    name: string;
    location_id: number | null;
    location: ApiLocation | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
    users: ApiUserSummary[];
    apps: ApiOrgApp[];
};

export type ApiLocation = {
    id: number;
    name: string;
    display_name: string;
    created_at: string;
    updated_at: string;
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
    location_id: number;
};

export type ApiComputeRegistry = {
    id: number;
    kind: string;
    ingress_host: string;
    ingress_name: string;
    location_id: number;
};

export type ApiComputeUsage = {
    organization: string;
    total_applications: number;
    total_pods: number;
    total_cpu: {
        requests_millicores: number;
        limits_millicores: number;
    };
    total_memory: {
        requests_bytes: number;
        limits_bytes: number;
    };
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
    deleted_by: ApiUserSummary | null;
};
