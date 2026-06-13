import type { PlatformRole, Role } from '@/lib/roles';
import type { Accent, Radius, Theme } from '@/lib/theme';

export type ApiInvitation = {
    id: string;
    email: string;
    role: string;
    created_at: string;
};

export type ApiUserSummary = {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: PlatformRole;
    admin: boolean;
    oidc_subject: string | null;
};

export type ApiUserOrganizationMembership = {
    id: string;
    name: string;
    role: Role;
};

export type ApiUserProfile = ApiUserSummary & {
    theme: Theme;
    accent: Accent;
    radius: Radius;
    language: string;
    oidc_subject: string | null;
    organizations: ApiUserOrganizationMembership[];
};

export type ApiOrganizationApplication = {
    id: string;
    name: string;
    slug: string;
    image: string;
    status: 'creating' | 'running' | 'deleting' | 'failed';
    role: Role | null;
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

export type ApiOrganizationSummary = {
    id: string;
    name: string;
    avatar: string | null;
    location_id: string | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiOrganizationDetails = {
    id: string;
    name: string;
    avatar: string | null;
    location_id: string | null;
    location: ApiLocation | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
    users: ApiUserSummary[];
    invitations: ApiInvitation[];
    applications: ApiOrganizationApplication[];
};

export type ApiLocation = {
    id: string;
    name: string;
    slug: string;
    country: string;
    created_at: string;
    updated_at: string;
    compute_registries: Array<ApiComputeRegistry>;
    database_registries: Array<ApiDatabaseRegistry>;
    storage_registries: Array<ApiStorageRegistry>;
};

export type ApiDatabaseDatabase = {
    name: string;
};

export type ApiDatabaseSchema = {
    name: string;
};

export type ApiDatabaseRegistry = {
    id: string;
    kind: string;
    name: string;
    host: string;
    port: number;
    username: string;
    location_id: string;
    created_at: string;
    created_by: ApiUserSummary | null;
    updated_at: string;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiStorageRegistry = {
    id: string;
    kind: string;
    name: string;
    protocol: string;
    endpoint_url: string;
    access_key_id: string;
    location_id: string;
    created_at: string;
    created_by: ApiUserSummary | null;
    updated_at: string;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiComputeRegistry = {
    id: string;
    kind: string;
    ingress_host: string;
    location_id: string;
    created_at: string;
    created_by: ApiUserSummary | null;
    updated_at: string;
    updated_by: ApiUserSummary | null;
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
    cpu_limit: number;
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

export type ApiApplicationResponse = {
    id: string;
    organization_id: string;
    organization: ApiOrganizationSummary;
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
    id: string;
    kind: string;
    application_id: string | null;
    step: string;
    status: string;
    error: string | null;
    created_at: string;
    started_at: string | null;
    stopped_at: string | null;
};
