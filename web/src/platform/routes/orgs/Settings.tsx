import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { hasMinimumRole } from '@/lib/roles';
import { Stack } from '@/components/ui/Stack';
import { Text } from '@astryxdesign/core/Text';
import People from '@/components/settings/People';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useLocation, useParams } from 'react-router';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { skipToken, useQuery } from '@tanstack/react-query';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import OrganizationAvatar from '@/components/settings/OrganizationAvatar';
import ApplicationSettings from '@/components/settings/ApplicationSettings';
import { Menu, MenuItem, MenuSection, MenuSubSection } from '@/components/ui/Menu';
import { useOrganization, useOrganizationApplications } from '@/lib/hooks/use-organization';
import {
    zGetOrganizationDatabaseUsageApiV1OrganizationsOrganizationIdDatabaseGetResponse,
    zOrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the organization settings page. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();
    const { hash } = useLocation();
    const {
        organization: organizationDetails,
        members,
        invitations,
        role: organizationRole,
        isLoading: isOrganizationLoading,
        error: organizationError,
    } = useOrganization(organization);
    const {
        applications,
        isLoading: isApplicationsLoading,
        error: applicationsError,
    } = useOrganizationApplications(organization);
    const isLoading = isOrganizationLoading || isApplicationsLoading;
    const error = organizationError ?? applicationsError;
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const organizationId = organizationDetails?.id ?? '';
    const canManageOrganization = hasMinimumRole(organizationRole, 'admin');
    const hasOrganizationApplicationAccess = hasMinimumRole(organizationRole, 'maintain');
    const peopleProps = {
        organizationId,
        members,
        invitations,
        canInviteMembers: hasOrganizationApplicationAccess,
        canManageMembers: canManageOrganization,
        isLoading,
        error,
    };
    const isOrganizationSectionActive = hash === '' || hash === '#organization';
    const databasePath =
        isOrganizationSectionActive && organizationId ? `/api/v1/organizations/${organizationId}/database` : null;
    const {
        data: databaseUsage,
        error: databaseError,
        isLoading: isDatabaseLoading,
    } = useQuery({
        queryKey: ['api', databasePath],
        queryFn:
            databasePath === null
                ? skipToken
                : async ({ signal }) =>
                      zGetOrganizationDatabaseUsageApiV1OrganizationsOrganizationIdDatabaseGetResponse.parse(
                          await api(databasePath, { signal }).json()
                      ),
        retry: false,
    });
    const storagePath =
        isOrganizationSectionActive && organizationId ? `/api/v1/organizations/${organizationId}/storage` : null;
    const {
        data: storageUsage,
        error: storageError,
        isLoading: isStorageLoading,
    } = useQuery({
        queryKey: ['api', storagePath],
        queryFn:
            storagePath === null
                ? skipToken
                : async ({ signal }) =>
                      zOrganizationStorageUsageResponse.nullable().parse(await api(storagePath, { signal }).json()),
        retry: false,
    });
    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    return (
        <PageContainer gap={8}>
            <Stack>
                <Heading level={1}>Settings</Heading>
                <Text as="p" color="secondary">
                    Configure the organization and its runtime defaults.
                </Text>
            </Stack>
            <Menu>
                <MenuSection title="Settings" isHeaderHidden>
                    <MenuItem icon="building2" label="Organization">
                        <Stack gap={4}>
                            <Stack direction="horizontal" justify="between" align="start">
                                <Stack>
                                    <Heading level={2}>Organization</Heading>
                                    <Text type="supporting">View and manage organization details.</Text>
                                </Stack>
                                <OrganizationAvatar
                                    canManage={canManageOrganization}
                                    name={organizationName}
                                    organizationId={organizationId}
                                    src={organizationAvatar}
                                />
                            </Stack>
                            <Divider />
                            <ProgressBar
                                formatValueLabel={(value) =>
                                    databaseError ? 'Unavailable' : `${formatBytes(value)} used`
                                }
                                hasValueLabel
                                isDisabled={databaseError !== null}
                                isIndeterminate={isDatabaseLoading}
                                label="Database"
                                max={Math.max(databaseUsage ?? 0, 1)}
                                value={databaseUsage ?? 0}
                                variant="neutral"
                            />
                            <ProgressBar
                                formatValueLabel={(value) =>
                                    storageError ? 'Unavailable' : `${formatBytes(value)} used`
                                }
                                hasValueLabel
                                isDisabled={storageError !== null}
                                isIndeterminate={isStorageLoading}
                                label="Storage"
                                max={Math.max(storageUsage?.space_used ?? 0, 1)}
                                value={storageUsage?.space_used ?? 0}
                                variant="neutral"
                            />
                        </Stack>
                    </MenuItem>
                    <MenuSubSection icon="users" label="People">
                        <MenuItem label="Members">
                            <People {...peopleProps} activeSection="members" />
                        </MenuItem>
                        <MenuItem label="Invitations">
                            <People {...peopleProps} activeSection="invitations" />
                        </MenuItem>
                    </MenuSubSection>
                    <MenuItem icon="boxes" label="Applications">
                        <ApplicationSettings
                            organizationId={organizationId}
                            organizationSlug={organization}
                            applications={applications}
                            canManageApplications={hasOrganizationApplicationAccess}
                            isLoading={isLoading}
                            error={error}
                        />
                    </MenuItem>
                </MenuSection>
            </Menu>
        </PageContainer>
    );
}
