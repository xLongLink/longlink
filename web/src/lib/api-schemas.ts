import {
    zApplicationResponse,
    zComputeRegistryResponse,
    zDatabaseRegistryResponse,
    zDatabaseSslMode,
    zEmailPayload,
    zIcon,
    zLongLinkMetadata,
    zOperationResponse,
    zOrganizationApplicationSummary,
    zOrganizationDetails,
    zOrganizationDatabaseUsageResponse,
    zOrganizationInvitationResponse,
    zOrganizationMemberAccessResponse,
    zOrganizationStorageUsageResponse,
    zOrganizationSummary,
    zStatus,
    zStorageRegistryResponse,
    zUserOrganizationMembership,
    zUserProfile,
    zUserSummary,
} from '@/lib/generated/platform-api-v1/zod.gen';

export const statusSchema = zStatus;
export const DATABASE_SSL_MODES = zDatabaseSslMode.options;
export const apiRegistrationVerifiedSchema = zEmailPayload;
export const apiUserSummarySchema = zUserSummary;
export const apiUserOrganizationMembershipSchema = zUserOrganizationMembership;
export const apiUserProfileSchema = zUserProfile;
export const apiInvitationSchema = zOrganizationInvitationResponse;
export const apiOrganizationMemberSchema = zOrganizationMemberAccessResponse;
export const apiOrganizationSummarySchema = zOrganizationSummary;
export const apiOrganizationApplicationSchema = zOrganizationApplicationSummary;
export const apiOrganizationDetailsSchema = zOrganizationDetails;
export const apiOrganizationDatabaseUsageSchema = zOrganizationDatabaseUsageResponse;
export const apiOrganizationStorageUsageSchema = zOrganizationStorageUsageResponse;
export const apiImageMetadataSchema = zLongLinkMetadata;
export const apiIconsSchema = zIcon.array();
export const apiApplicationResponseSchema = zApplicationResponse;
export const apiDatabaseRegistrySchema = zDatabaseRegistryResponse;
export const apiStorageRegistrySchema = zStorageRegistryResponse;
export const apiComputeRegistrySchema = zComputeRegistryResponse;
export const apiOperationSchema = zOperationResponse;
