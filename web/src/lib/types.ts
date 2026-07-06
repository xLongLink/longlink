import type { UserLanguage } from '@/lib/languages';
import type { ApplicationRole, PlatformRole, Role } from '@/lib/roles';
import type { Accent, Radius, Theme } from '@/lib/theme';
import type { IconName } from 'lucide-react/dynamic';

export type ApiInvitation = {
    id: string;
    email: string;
    role: Role;
    created_at: string;
};

export type ApiUserSummary = {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: PlatformRole;
    oidc: string;
};

export type ApiUserOrganizationMembership = {
    id: string;
    name: string;
    slug: string;
    avatar: string;
    location: ApiLocation;
    role: Role;
};

export type ApiUserProfile = ApiUserSummary & {
    theme: Theme;
    accent: Accent;
    radius: Radius;
    language: UserLanguage;
    organizations: ApiUserOrganizationMembership[];
};

export type ApiOrganizationApplication = {
    id: string;
    name: string;
    slug: string;
    image: string;
    version: string | null;
    sdk: string | null;
    digest: string | null;
    status: 'creating' | 'running' | 'failed';
    role: ApplicationRole | null;
    description: string | null;
    icon: IconName | null;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiApplicationMember = {
    id: string;
    name: string;
    email: string;
    avatar: string;
    application_role: ApplicationRole | null;
    organization_role: Role;
};

export type ApiOrganizationMemberSummary = {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: Role;
};

export type ApiEnvironmentMetadata = {
    name: string;
    type: string;
    description: string | null;
    required: boolean;
};

export type ApiImageMetadata = {
    title: string | null;
    description: string | null;
    version: string | null;
    sdk: string | null;
    digest: string | null;
    environments: ApiEnvironmentMetadata[];
};

export type ApiIconCatalog = {
    icons: IconName[];
};

export type ApiOrganizationSummary = {
    id: string;
    name: string;
    slug: string;
    avatar: string;
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
    slug: string;
    avatar: string;
    location_id: string | null;
    location: ApiLocation;
    created_at: string;
    updated_at: string;
    created_by: ApiUserSummary | null;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
    users: ApiOrganizationMemberSummary[];
    invitations: ApiInvitation[];
    applications: ApiOrganizationApplication[];
};

export type ApiLocation = {
    id: string;
    name: string;
    slug: string;
    country: string;
};

export type ApiDatabaseInstance = {
    name: string;
};

export type ApiDatabaseSchema = {
    name: string;
};

export type ApiOrganizationDatabaseApplication = {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    status: 'creating' | 'running' | 'failed';
};

export type ApiOrganizationDatabaseResource = {
    name: string;
    kind: 'schema';
    database_name: string;
    space_used: number | null;
    table_count: number | null;
    row_estimate: number | null;
    application: ApiOrganizationDatabaseApplication | null;
    database_registry_id: string;
    database_registry_name: string;
};

export type ApiOrganizationDatabaseTableColumn = {
    name: string;
    type: string;
    nullable: boolean;
    position: number;
};

export type ApiOrganizationDatabaseTable = {
    name: string;
    schema_name: string;
    columns: ApiOrganizationDatabaseTableColumn[];
    rows: Array<Record<string, string | number | boolean | null>>;
};

export type ApiOrganizationStorageApplication = {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    status: 'creating' | 'running' | 'failed';
};

export type ApiOrganizationStorageResource = {
    kind: 'shared_bucket' | 'application_bucket';
    name: string;
    bucket_name: string;
    application: ApiOrganizationStorageApplication | null;
    storage_registry_id: string;
    storage_registry_name: string;
    space_used: number | null;
    object_count: number | null;
};

export type ApiDatabaseUsage = {
    space_used: number;
};

export type ApiDatabaseRegistry = {
    id: string;
    kind: string;
    name: string;
    slug: string;
    host: string;
    port: number;
    username: string;
    runtime_host: string;
    runtime_port: number;
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
    slug: string;
    protocol: string;
    endpoint_url: string;
    access_key_id: string;
    runtime_endpoint_url: string;
    location_id: string;
    created_at: string;
    created_by: ApiUserSummary | null;
    updated_at: string;
    updated_by: ApiUserSummary | null;
    deleted_at: string | null;
    deleted_by: ApiUserSummary | null;
};

export type ApiStorageBucket = {
    name: string;
};

export type ApiStorageObject = {
    key: string;
    size: number;
    etag: string | null;
    last_modified: string | null;
};

export type ApiComputeRegistry = {
    id: string;
    kind: string;
    slug: string;
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

export type ApiOperationStatus = 'scheduled' | 'active' | 'completed' | 'failed';

export type ApiApplicationResponse = {
    id: string;
    organization_id: string;
    organization: ApiOrganizationSummary;
    name: string;
    slug: string;
    image: string;
    version: string | null;
    sdk: string | null;
    digest: string | null;
    status: 'creating' | 'running' | 'failed';
    role: ApplicationRole | null;
    description: string | null;
    icon: IconName | null;
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
    organization_id: string | null;
    step: string;
    status: ApiOperationStatus;
    error: string | null;
    created_at: string;
    started_at: string | null;
    stopped_at: string | null;
};
