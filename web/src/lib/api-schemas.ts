import { z } from 'zod';
import { ICON_NAMES } from '@/lib/icons';
import { PLATFORM_ROLE_NAMES, ROLE_NAMES } from '@/lib/roles';
import { ACCENT_VALUES, MAX_RADIUS, MIN_RADIUS, THEME_VALUES } from '@/lib/theme';

export const statusSchema = z.enum(['creating', 'running', 'failed', 'deleting']);
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

const apiUserIdentitySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string(),
});

export const apiUserSummarySchema = apiUserIdentitySchema.extend({
    role: platformRoleSchema,
});

const apiOrganizationReferenceSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string(),
});

export const apiUserOrganizationMembershipSchema = z.object({
    organization: apiOrganizationReferenceSchema,
    role: roleSchema,
});

export const apiUserProfileSchema = apiUserSummarySchema.extend({
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
});

export const apiOrganizationApplicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    icon: iconNameSchema,
    description: z.string().nullable(),
    status: statusSchema,
});

export const apiOrganizationDetailsSchema = z.object({
    organization: apiOrganizationSummarySchema,
    members: z.array(apiOrganizationMemberSchema),
    invitations: z.array(apiInvitationSchema),
    applications: z.array(apiOrganizationApplicationSchema),
});

const apiEnvironmentMetadataSchema = z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().nullable(),
    required: z.boolean(),
});

export const apiImageMetadataSchema = z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    environments: z.array(apiEnvironmentMetadataSchema),
});

export const apiIconsSchema = z.array(z.enum(ICON_NAMES));

export const apiApplicationResponseSchema = z.object({
    id: z.string(),
    organization: apiOrganizationReferenceSchema,
    name: z.string(),
    slug: z.string(),
    image: z.string(),
    status: statusSchema,
    description: z.string().nullable(),
    created_at: z.string(),
});

export const apiDatabaseRegistrySchema = z.object({
    id: z.string(),
    name: z.string(),
    host: z.string(),
    port: z.number(),
    sslmode: databaseSslModeSchema,
    username: z.string(),
});

export const apiStorageRegistrySchema = z.object({
    id: z.string(),
    name: z.string(),
    endpoint_url: z.string(),
});

export const apiComputeRegistrySchema = z.object({
    id: z.string(),
    name: z.string(),
    status: statusSchema,
});

export const apiOperationSchema = z.object({
    id: z.string(),
    kind: z.enum([
        'compute.reconcile',
        'application.create',
        'application.delete',
        'organization.create',
        'organization.delete',
    ]),
    target_id: z.string(),
    status: z.enum(['scheduled', 'active', 'completed', 'failed']),
    platform_version: z.string(),
    created_at: z.string(),
    finished_at: z.string().nullable(),
    available_at: z.string(),
});

export const apiOrganizationDatabaseUsageSchema = z.object({
    database_name: z.string(),
    space_used: z.number().int().nonnegative(),
    table_count: z.number().int().nonnegative(),
});

export const apiOrganizationStorageUsageSchema = z.object({
    bucket_name: z.string(),
    space_used: z.number().int().nonnegative(),
});
