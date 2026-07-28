import type { z } from 'zod';
import type {
    apiApplicationResponseSchema,
    apiComputePodSchema,
    apiComputeRegistrySchema,
    apiDatabaseRegistrySchema,
    apiImageMetadataSchema,
    apiInvitationSchema,
    apiOperationSchema,
    apiOrganizationApplicationSchema,
    apiOrganizationDatabaseUsageSchema,
    apiOrganizationDetailsSchema,
    apiOrganizationMemberSchema,
    apiOrganizationStorageUsageSchema,
    apiOrganizationSummarySchema,
    apiStorageRegistrySchema,
    apiUserOrganizationMembershipSchema,
    apiUserProfileSchema,
    apiUserSummarySchema,
    statusSchema,
} from '@/lib/api-schemas';

export type Status = z.infer<typeof statusSchema>;
export type ApiInvitation = z.infer<typeof apiInvitationSchema>;
export type ApiUserSummary = z.infer<typeof apiUserSummarySchema>;
export type ApiUserOrganizationMembership = z.infer<typeof apiUserOrganizationMembershipSchema>;
export type ApiUserProfile = z.infer<typeof apiUserProfileSchema>;
export type ApiOrganizationApplication = z.infer<typeof apiOrganizationApplicationSchema>;
export type ApiOrganizationMember = z.infer<typeof apiOrganizationMemberSchema>;
export type ApiImageMetadata = z.infer<typeof apiImageMetadataSchema>;
export type ApiOrganizationSummary = z.infer<typeof apiOrganizationSummarySchema>;
export type ApiOrganizationDetails = z.infer<typeof apiOrganizationDetailsSchema>;
export type ApiOrganizationDatabaseUsage = z.infer<typeof apiOrganizationDatabaseUsageSchema>;
export type ApiOrganizationStorageUsage = z.infer<typeof apiOrganizationStorageUsageSchema>;
export type ApiDatabaseRegistry = z.infer<typeof apiDatabaseRegistrySchema>;
export type ApiStorageRegistry = z.infer<typeof apiStorageRegistrySchema>;
export type ApiComputeRegistry = z.infer<typeof apiComputeRegistrySchema>;
export type ApiComputePod = z.infer<typeof apiComputePodSchema>;
export type ApiApplicationResponse = z.infer<typeof apiApplicationResponseSchema>;
export type ApiOperation = z.infer<typeof apiOperationSchema>;
