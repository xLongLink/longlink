import { z } from 'zod';
import { ICON_NAMES } from '@/lib/icons';
import { LANGUAGE_VALUES } from '@/lib/languages';
import { ACCENT_VALUES, RADIUS_VALUES, THEME_VALUES } from '@/lib/theme';
import { APPLICATION_ROLE_NAMES, PLATFORM_ROLE_NAMES, ROLE_NAMES } from '@/lib/roles';

const applicationStatusSchema = z.enum(['creating', 'running', 'failed']);
const applicationRoleSchema = z.enum(APPLICATION_ROLE_NAMES);
const platformRoleSchema = z.enum(PLATFORM_ROLE_NAMES);
const roleSchema = z.enum(ROLE_NAMES);
const themeSchema = z.enum(THEME_VALUES);
const accentSchema = z.enum(ACCENT_VALUES);
const radiusSchema = z.enum(RADIUS_VALUES);
const iconNameSchema = z.enum(ICON_NAMES).nullable();
const languageSchema = z.enum(LANGUAGE_VALUES);

export const apiLocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    country: z.string(),
});

export const apiUserSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
    role: platformRoleSchema,
});

export const apiUserListItemSchema = apiUserSummarySchema.extend({
    oidc: z.string(),
});

const nullableUserSummarySchema = apiUserSummarySchema.nullable();

export const apiUserOrganizationMembershipSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string(),
    country: z.string(),
    location: apiLocationSchema,
    role: roleSchema,
});

export const apiUserProfileSchema = apiUserListItemSchema.extend({
    theme: themeSchema,
    accent: accentSchema,
    radius: radiusSchema,
    language: languageSchema,
});

export const apiInvitationSchema = z.object({
    id: z.string(),
    email: z.string(),
    role: roleSchema,
    created_at: z.string(),
});

export const apiOrganizationMemberSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
    role: roleSchema,
});

export const apiOrganizationSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string(),
    country: z.string(),
    location_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
});

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
});

export const apiOrganizationDetailsSchema = apiOrganizationSummarySchema.extend({
    location: apiLocationSchema,
    users: z.array(apiOrganizationMemberSummarySchema),
    invitations: z.array(apiInvitationSchema),
    applications: z.array(apiOrganizationApplicationSchema),
});

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
});

export const apiIconsSchema = z.array(z.enum(ICON_NAMES));

export const apiCountryOptionSchema = z.object({
    code: z.string(),
    name: z.string(),
});

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
});

export const apiApplicationMemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
    application_role: applicationRoleSchema.nullable(),
    organization_role: roleSchema,
});

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
});

export const apiStorageRegistrySchema = z.object({
    id: z.string(),
    kind: z.string(),
    name: z.string(),
    slug: z.string(),
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
});

export const apiComputeRegistrySchema = z.object({
    id: z.string(),
    slug: z.string(),
    gateway_url: z.string(),
    location_id: z.string(),
    created_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_at: z.string(),
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
});

export const apiOperationSchema = z.object({
    id: z.string(),
    kind: z.string(),
    application_id: z.string().nullable(),
    organization_id: z.string().nullable(),
    status: z.enum(['scheduled', 'active', 'completed', 'failed']),
    error: z.string().nullable(),
    created_at: z.string(),
    started_at: z.string().nullable(),
    stopped_at: z.string().nullable(),
});

export const apiStorageObjectSchema = z.object({
    key: z.string(),
    size: z.number(),
    etag: z.string().nullable(),
});

export const apiComputePodSchema = z.object({
    name: z.string(),
    status: z.string(),
    node: z.string().nullable(),
});

const apiOrganizationDatabaseApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: iconNameSchema,
    description: z.string().nullable(),
    status: applicationStatusSchema,
});

export const apiOrganizationDatabaseResourceSchema = z.object({
    name: z.string(),
    kind: z.literal('schema'),
    database_name: z.string(),
    space_used: z.number().nullable(),
    table_count: z.number().nullable(),
    application: apiOrganizationDatabaseApplicationSchema.nullable(),
    database_registry_id: z.string(),
    database_registry_name: z.string(),
});

const apiOrganizationStorageApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: iconNameSchema,
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
});

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
});

export const apiOrganizationDatabaseTableRowsSchema = z.object({
    name: z.string(),
    schema_name: z.string(),
    rows: z.array(z.record(z.string(), z.string())),
});

/** Validates an API response value with a Zod schema. */
export function parseApiResponse<T>(schema: z.ZodType<T>, value: unknown): T {
    return schema.parse(value);
}

/** Validates an API collection response value with an item schema. */
export function parseApiCollection<T>(schema: z.ZodType<T>, value: unknown): T[] {
    return z.array(schema).parse(value);
}
