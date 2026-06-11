import type { Role } from '@/lib/roles';
import type { Accent, Radius, Theme } from '@/lib/theme';

export type ApiInvitation = {
    id: number;
    email: string;
    role: string;
    created_at: string;
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
    description: string | null;
    icon: string | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiEnvironmentMetadata = {
    name: string;
    type: string;
    description: string | null;
};

export type ApiImageMetadata = {
    title: string | null;
    description: string | null;
    required_envs: ApiEnvironmentMetadata[];
    optional_envs: ApiEnvironmentMetadata[];
};

export type ApiOrgSummary = {
    name: string;
    avatar: string | null;
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
    avatar: string | null;
    location_id: number | null;
    location: ApiLocation | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
    users: ApiUserSummary[];
    invitations: ApiInvitation[];
    apps: ApiOrgApp[];
};

export type ApiLocation = {
    id: number;
    name: string;
    display_name: string;
    country: string;
    created_at: string;
    updated_at: string;
    compute_registries: Array<ApiComputeRegistry>;
    database_registries: Array<ApiDatabaseRegistry>;
    storage_registries: Array<ApiStorageRegistry>;
};

export type ApiDatabaseRegistry = {
    id: number;
    kind: string;
    name: string;
    host: string;
    port: number;
    username: string;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
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
    location_id: number;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiComputeNamespace = {
    name: string;
};

export type ApiComputeResources = {
    ram_total: number;
    ram_free: number;
    cpu_total: number;
    cpu_free: number;
};

export type ApiComputePodResources = {
    cpu_request: number;
    cpu_limit: number;
    ram_request: number;
    ram_limit: number;
    cpu_usage: number;
    ram_usage: number;
};

export type ApiComputePod = {
    name: string;
    status: string;
    node: string | null;
    created_at: string | null;
    resources: ApiComputePodResources | null;
};

export type ApiAppResponse = {
    id: number;
    organization: string;
    name: string;
    slug: string;
    image: string;
    status: 'creating' | 'running' | 'deleting' | 'failed';
    role: Role | null;
    description: string | null;
    icon: string | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary;
    updated_by: ApiUserSummary;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiOperation = {
    id: number;
    kind: string;
    payload: Record<string, unknown>;
    created_at: string;
    started_at: string | null;
    stopped_at: string | null;
};
