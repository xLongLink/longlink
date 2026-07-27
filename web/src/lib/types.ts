import type { z } from 'zod';
import type {
    apiApplicationMemberSchema,
    apiApplicationResponseSchema,
    apiComputePodSchema,
    apiComputeRegistrySchema,
    apiDatabaseRegistrySchema,
    apiImageMetadataSchema,
    apiInvitationSchema,
    apiOperationSchema,
    apiOrganizationApplicationSchema,
    apiOrganizationDatabaseResourceSchema,
    apiOrganizationDetailsSchema,
    apiOrganizationMemberSchema,
    apiOrganizationStorageResourceSchema,
    apiOrganizationSummarySchema,
    apiStorageRegistrySchema,
    apiUserOrganizationMembershipSchema,
    apiUserProfileSchema,
    apiUserSummarySchema,
} from '@/lib/api-schemas';

export type ApiInvitation = z.infer<typeof apiInvitationSchema>;
export type ApiUserSummary = z.infer<typeof apiUserSummarySchema>;
export type ApiUserOrganizationMembership = z.infer<typeof apiUserOrganizationMembershipSchema>;
export type ApiUserProfile = z.infer<typeof apiUserProfileSchema>;
export type ApiOrganizationApplication = z.infer<typeof apiOrganizationApplicationSchema>;
export type ApiApplicationMember = z.infer<typeof apiApplicationMemberSchema>;
export type ApiOrganizationMember = z.infer<typeof apiOrganizationMemberSchema>;
export type ApiImageMetadata = z.infer<typeof apiImageMetadataSchema>;
export type ApiOrganizationSummary = z.infer<typeof apiOrganizationSummarySchema>;
export type ApiOrganizationDetails = z.infer<typeof apiOrganizationDetailsSchema>;
export type ApiOrganizationDatabaseResource = z.infer<typeof apiOrganizationDatabaseResourceSchema>;
export type ApiOrganizationStorageResource = z.infer<typeof apiOrganizationStorageResourceSchema>;
export type ApiDatabaseRegistry = z.infer<typeof apiDatabaseRegistrySchema>;
export type ApiStorageRegistry = z.infer<typeof apiStorageRegistrySchema>;
export type ApiComputeRegistry = z.infer<typeof apiComputeRegistrySchema>;
export type ApiComputePod = z.infer<typeof apiComputePodSchema>;
export type ApiApplicationResponse = z.infer<typeof apiApplicationResponseSchema>;
export type ApiOperation = z.infer<typeof apiOperationSchema>;
