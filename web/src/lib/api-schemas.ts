import { z } from 'zod';
import { ICON_NAMES } from '@/lib/icons';
import { APPLICATION_ROLE_NAMES, PLATFORM_ROLE_NAMES, ROLE_NAMES } from '@/lib/roles';
import { ACCENT_VALUES, MAX_RADIUS, MIN_RADIUS, THEME_VALUES } from '@/lib/theme';

const applicationStatusSchema = z.enum(['creating', 'running', 'failed', 'deleting']);
const applicationRoleSchema = z.enum(APPLICATION_ROLE_NAMES);
const platformRoleSchema = z.enum(PLATFORM_ROLE_NAMES);
const roleSchema = z.enum(ROLE_NAMES);
const themeSchema = z.enum(THEME_VALUES);
const accentSchema = z.enum(ACCENT_VALUES);
const radiusSchema = z.number().min(MIN_RADIUS).max(MAX_RADIUS);
const iconNameSchema = z.enum(ICON_NAMES).nullable();
const databaseSslModeSchema = z.enum(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']);

export const apiRegistrationVerifiedSchema = z.object({
    email: z.email(),
});

export const apiUserIdentitySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
});

export const apiUserSummarySchema = apiUserIdentitySchema.extend({
    role: platformRoleSchema,
});

export const apiUserListItemSchema = apiUserSummarySchema;

const nullableUserSummarySchema = apiUserSummarySchema.nullable();

export const apiUserOrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string(),
});

export const apiUserOrganizationMembershipSchema = z.object({
    organization: apiUserOrganizationSchema,
    role: roleSchema,
});

export const apiUserProfileSchema = apiUserListItemSchema.extend({
    theme: themeSchema,
    accent: accentSchema,
    radius: radiusSchema,
});

export const apiInvitationSchema = z.object({
    id: z.string(),
    email: z.string(),
    role: roleSchema,
    created_at: z.string(),
});

export const apiOrganizationMemberSchema = z.object({
    user: apiUserIdentitySchema,
    role: roleSchema,
});

export const apiOrganizationSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string(),
    compute_id: z.string(),
    database_id: z.string(),
    storage_id: z.string(),
    status: z.enum(['creating', 'running', 'failed', 'deleting']),
    created_at: z.string(),
    updated_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
});

export const apiOrganizationApplicationSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: iconNameSchema,
    description: z.string().nullable(),
    status: applicationStatusSchema,
});

export const apiOrganizationApplicationSchema = z.object({
    application: apiOrganizationApplicationSummarySchema,
    role: applicationRoleSchema.nullable(),
});

export const apiOrganizationDetailsSchema = z.object({
    organization: apiOrganizationSummarySchema,
    members: z.array(apiOrganizationMemberSchema),
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
    user: apiUserIdentitySchema,
    application_role: applicationRoleSchema.nullable(),
    organization_role: roleSchema,
});

export const apiDatabaseRegistrySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    host: z.string(),
    port: z.number(),
    sslmode: databaseSslModeSchema,
    username: z.string(),
    created_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_at: z.string(),
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
});

export const apiStorageRegistrySchema = z.object({
    id: z.string(),
    kind: z.literal('exoscale'),
    name: z.string(),
    slug: z.string(),
    endpoint_url: z.string(),
    runtime_endpoint_url: z.string(),
    created_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_at: z.string(),
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
});

export const apiComputeRegistrySchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    gateway_url: z.string().nullable(),
    status: z.enum(['provisioning', 'ready', 'failed', 'deleting']),
    version: z.string().nullable(),
    created_at: z.string(),
    created_by: nullableUserSummarySchema,
    updated_at: z.string(),
    updated_by: nullableUserSummarySchema,
    deleted_at: z.string().nullable(),
    deleted_by: nullableUserSummarySchema,
});

export const apiOperationSchema = z.object({
    id: z.string(),
    kind: z.enum([
        'compute',
        'storage',
        'application.create',
        'application.delete',
        'organization.create',
        'organization.delete',
        'organization.reconcile',
    ]),
    target_id: z.string(),
    status: z.enum(['scheduled', 'active', 'completed', 'failed']),
    platform_version: z.string(),
    attempt_count: z.number().int().nonnegative(),
    created_at: z.string(),
    started_at: z.string().nullable(),
    stopped_at: z.string().nullable(),
    scheduled_at: z.string(),
});

export const apiComputeMutationResponseSchema = z.object({
    compute: apiComputeRegistrySchema,
    operation: apiOperationSchema,
});

export const apiOrganizationMutationResponseSchema = z.object({
    organization: apiOrganizationSummarySchema,
    operation: apiOperationSchema,
});

export const apiApplicationMutationResponseSchema = z.object({
    application: apiApplicationResponseSchema,
    operation: apiOperationSchema,
});

export const apiComputePodSchema = z.object({
    name: z.string(),
    status: z.string(),
    node: z.string().nullable(),
});

export const apiOrganizationDatabaseResourceSchema = z.object({
    name: z.string(),
    database_name: z.string(),
    space_used: z.number().nullable(),
    table_count: z.number().nullable(),
    application: apiOrganizationApplicationSummarySchema.nullable(),
});

export const apiOrganizationStorageResourceSchema = z.object({
    kind: z.enum(['shared_prefix', 'application_prefix']),
    name: z.string(),
    bucket_name: z.string(),
    prefix: z.string(),
    application: apiOrganizationApplicationSummarySchema.nullable(),
    space_used: z.number().nullable(),
    object_count: z.number().nullable(),
});

/** Validates an API response value with a Zod schema. */
export function parseApiResponse<T>(schema: z.ZodType<T>, value: unknown): T {
    return schema.parse(value);
}

/** Validates an API collection response value with an item schema. */
export function parseApiCollection<T>(schema: z.ZodType<T>, value: unknown): T[] {
    return z.array(schema).parse(value);
}
