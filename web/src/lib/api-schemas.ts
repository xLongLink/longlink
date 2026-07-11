import { APPLICATION_ROLE_NAMES, PLATFORM_ROLE_NAMES, ROLE_NAMES } from '@/lib/roles';
import { ACCENT_VALUES, RADIUS_VALUES, THEME_VALUES } from '@/lib/theme';
import type {
    ApiApplicationResponse,
    ApiApplicationMember,
    ApiComputeNamespace,
    ApiComputePod,
    ApiComputeRegistry,
    ApiCountryOption,
    ApiDatabaseInstance,
    ApiDatabaseRegistry,
    ApiDatabaseSchema,
    ApiImageMetadata,
    ApiInvitation,
    ApiLocation,
    ApiOperation,
    ApiOrganizationApplication,
    ApiOrganizationDatabaseResource,
    ApiOrganizationDatabaseTable,
    ApiOrganizationDetails,
    ApiOrganizationMemberSummary,
    ApiOrganizationStorageResource,
    ApiOrganizationSummary,
    ApiStorageBucket,
    ApiStorageObject,
    ApiStorageRegistry,
    ApiUserListItem,
    ApiUserOrganizationMembership,
    ApiUserProfile,
    ApiUserSummary,
} from '@/lib/types';
import { z } from 'zod';

const applicationStatusSchema = z.enum(['creating', 'running', 'failed']);
const applicationRoleSchema = z.enum(APPLICATION_ROLE_NAMES);
const platformRoleSchema = z.enum(PLATFORM_ROLE_NAMES);
const roleSchema = z.enum(ROLE_NAMES);
const themeSchema = z.enum(THEME_VALUES);
const accentSchema = z.enum(ACCENT_VALUES);
const radiusSchema = z.enum(RADIUS_VALUES);
const iconNameSchema = z.string().nullable() as z.ZodType<ApiOrganizationApplication['icon']>;

export const apiLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    country: z.string(),
}) satisfies z.ZodType<ApiLocation>;

export const apiUserSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
    role: platformRoleSchema,
}) satisfies z.ZodType<ApiUserSummary>;

export const apiUserListItemSchema = apiUserSummarySchema.extend({
    oidc: z.string(),
}) satisfies z.ZodType<ApiUserListItem>;

const nullableUserSummarySchema = apiUserSummarySchema.nullable();

export const apiUserOrganizationMembershipSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string(),
    country: z.string(),
    location: apiLocationSchema,
    role: roleSchema,
}) satisfies z.ZodType<ApiUserOrganizationMembership>;

export const apiUserProfileSchema = apiUserListItemSchema.extend({
    theme: themeSchema,
    accent: accentSchema,
    radius: radiusSchema,
    language: z.string(),
    organizations: z.array(apiUserOrganizationMembershipSchema),
}) satisfies z.ZodType<ApiUserProfile>;

export const apiInvitationSchema = z.object({
    id: z.string(),
    email: z.string(),
    role: roleSchema,
    created_at: z.string(),
}) satisfies z.ZodType<ApiInvitation>;

export const apiOrganizationMemberSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
    role: roleSchema,
}) satisfies z.ZodType<ApiOrganizationMemberSummary>;

export const apiOrganizationSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string(),
    country: z.string(),
    location_id: z.string().nullable(),
    shared_storage_bucket_name: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
}) satisfies z.ZodType<ApiOrganizationSummary>;

export const apiOrganizationApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    image: z.string(),
    version: z.string().nullable(),
    sdk: z.string().nullable(),
    digest: z.string().nullable(),
    status: applicationStatusSchema,
    role: applicationRoleSchema.nullable(),
    description: z.string().nullable(),
    icon: iconNameSchema,
    created_at: z.string(),
    updated_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
}) satisfies z.ZodType<ApiOrganizationApplication>;

export const apiOrganizationDetailsSchema = apiOrganizationSummarySchema.extend({
    location: apiLocationSchema,
    users: z.array(apiOrganizationMemberSummarySchema),
    invitations: z.array(apiInvitationSchema),
    applications: z.array(apiOrganizationApplicationSchema),
}) satisfies z.ZodType<ApiOrganizationDetails>;

export const apiEnvironmentMetadataSchema = z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().nullable(),
    required: z.boolean(),
});

export const apiImageMetadataSchema = z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    version: z.string().nullable(),
    sdk: z.string().nullable(),
    digest: z.string().nullable(),
    environments: z.array(apiEnvironmentMetadataSchema),
}) satisfies z.ZodType<ApiImageMetadata>;

export const apiIconsSchema = z.array(z.string()) satisfies z.ZodType<string[]>;

export const apiCountryOptionSchema = z.object({
    code: z.string(),
    name: z.string(),
}) satisfies z.ZodType<ApiCountryOption>;

export const apiApplicationResponseSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    organization: apiOrganizationSummarySchema,
    name: z.string(),
    slug: z.string(),
    image: z.string(),
    version: z.string().nullable(),
    sdk: z.string().nullable(),
    digest: z.string().nullable(),
    status: applicationStatusSchema,
    role: applicationRoleSchema.nullable(),
    description: z.string().nullable(),
    icon: iconNameSchema,
    created_at: z.string(),
    updated_at: z.string(),
    created_by: apiUserSummarySchema,
    updated_by: apiUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
}) satisfies z.ZodType<ApiApplicationResponse>;

export const apiApplicationMemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
    application_role: applicationRoleSchema.nullable(),
    organization_role: roleSchema,
}) satisfies z.ZodType<ApiApplicationMember>;

export const apiDatabaseRegistrySchema = z.object({
    id: z.string(),
    kind: z.string(),
    name: z.string(),
    slug: z.string(),
    host: z.string(),
    port: z.number(),
    username: z.string(),
    location_id: z.string(),
    created_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_at: z.string(),
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
}) satisfies z.ZodType<ApiDatabaseRegistry>;

export const apiStorageRegistrySchema = z.object({
    id: z.string(),
    kind: z.string(),
    name: z.string(),
    slug: z.string(),
    protocol: z.string(),
    endpoint_url: z.string(),
    access_key_id: z.string(),
    runtime_endpoint_url: z.string(),
    location_id: z.string(),
    created_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_at: z.string(),
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
}) satisfies z.ZodType<ApiStorageRegistry>;

export const apiComputeRegistrySchema = z.object({
    id: z.string(),
    slug: z.string(),
    ingress_host: z.string(),
    location_id: z.string(),
    created_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_at: z.string(),
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
}) satisfies z.ZodType<ApiComputeRegistry>;

export const apiOperationSchema = z.object({
    id: z.string(),
    kind: z.string(),
    application_id: z.string().nullable(),
    organization_id: z.string().nullable(),
    step: z.string(),
    status: z.enum(['scheduled', 'active', 'completed', 'failed']),
    error: z.string().nullable(),
    created_at: z.string(),
    started_at: z.string().nullable(),
    stopped_at: z.string().nullable(),
}) satisfies z.ZodType<ApiOperation>;

export const apiDatabaseInstanceSchema = z.object({
    name: z.string(),
}) satisfies z.ZodType<ApiDatabaseInstance>;

export const apiDatabaseSchemaSchema = z.object({
    name: z.string(),
}) satisfies z.ZodType<ApiDatabaseSchema>;

export const apiStorageBucketSchema = z.object({
    name: z.string(),
}) satisfies z.ZodType<ApiStorageBucket>;

export const apiStorageObjectSchema = z.object({
    key: z.string(),
    size: z.number(),
    etag: z.string().nullable(),
    last_modified: z.string().nullable(),
}) satisfies z.ZodType<ApiStorageObject>;

export const apiComputeNamespaceSchema = z.object({
    name: z.string(),
}) satisfies z.ZodType<ApiComputeNamespace>;

export const apiComputePodResourcesSchema = z.object({
    cpu_limit: z.number(),
    ram_limit: z.number(),
    cpu_usage: z.number(),
    ram_usage: z.number(),
});

export const apiComputePodSchema = z.object({
    name: z.string(),
    status: z.string(),
    node: z.string().nullable(),
    created_at: z.string().nullable(),
    resources: apiComputePodResourcesSchema.nullable(),
}) satisfies z.ZodType<ApiComputePod>;

const apiOrganizationDatabaseApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: z.string().nullable(),
    description: z.string().nullable(),
    status: applicationStatusSchema,
});

export const apiOrganizationDatabaseResourceSchema = z.object({
    name: z.string(),
    kind: z.literal('schema'),
    database_name: z.string(),
    space_used: z.number().nullable(),
    table_count: z.number().nullable(),
    row_estimate: z.number().nullable(),
    application: apiOrganizationDatabaseApplicationSchema.nullable(),
    database_registry_id: z.string(),
    database_registry_name: z.string(),
}) satisfies z.ZodType<ApiOrganizationDatabaseResource>;

const apiOrganizationStorageApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: z.string().nullable(),
    description: z.string().nullable(),
    status: applicationStatusSchema,
});

export const apiOrganizationStorageResourceSchema = z.object({
    kind: z.enum(['shared_bucket', 'application_bucket']),
    name: z.string(),
    bucket_name: z.string(),
    application: apiOrganizationStorageApplicationSchema.nullable(),
    storage_registry_id: z.string(),
    storage_registry_name: z.string(),
    space_used: z.number().nullable(),
    object_count: z.number().nullable(),
}) satisfies z.ZodType<ApiOrganizationStorageResource>;

const apiOrganizationDatabaseTableCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const apiOrganizationDatabaseTableSchema = z.object({
    name: z.string(),
    schema_name: z.string(),
    columns: z.array(
        z.object({
            name: z.string(),
            type: z.string(),
            nullable: z.boolean(),
            position: z.number(),
        })
    ),
    rows: z.array(z.record(z.string(), apiOrganizationDatabaseTableCellSchema)),
}) satisfies z.ZodType<ApiOrganizationDatabaseTable>;

/** Validates an API response value with a Zod schema. */
export function parseApiResponse<T>(schema: z.ZodType<T>, value: unknown): T {
    return schema.parse(value);
}

/** Validates an API collection response value with an item schema. */
export function parseApiCollection<T>(schema: z.ZodType<T>, value: unknown): T[] {
    return z.array(schema).parse(value);
}
