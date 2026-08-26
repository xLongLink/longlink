import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { S3 } from '@/components/svg/S3';
import { formatBytes } from '@/lib/utils';
import { hasMinimumRole } from '@/lib/roles';
import { Stack } from '@/components/ui/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import People from '@/components/settings/People';
import { Banner } from '@astryxdesign/core/Banner';
import { Heading } from '@astryxdesign/core/Heading';
import { useLocation, useParams } from 'react-router';
import { proportional } from '@astryxdesign/core/Table';
import { PostgreSQL } from '@/components/svg/PostgreSQL';
import { TextInput } from '@astryxdesign/core/TextInput';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { skipToken, useQuery } from '@tanstack/react-query';
import ApplicationSettings from '@/components/settings/ApplicationSettings';
import { Menu, MenuItem, MenuSection, MenuSubSection } from '@/components/ui/Menu';
import type { OrganizationStorageUsageResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { useOrganization, useOrganizationApplications, useUpdateOrganization } from '@/lib/hooks/use-organization';
import {
    zGetOrganizationDatabaseUsageApiV1OrganizationsOrganizationIdDatabaseGetResponse,
    zOrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';

const organizationAvatarSchema = z.union([
    z.literal(''),
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
]);

/** Renders the organization settings page. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();
    const toast = useToast();
    const location = useLocation();
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
    const updateOrganization = useUpdateOrganization(organizationId);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatar = editedAvatar ?? organizationAvatar;
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
    const hashSection = location.hash.slice(1);
    const databasePath =
        hashSection === 'database' && organizationId ? `/api/v1/organizations/${organizationId}/database` : null;
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
        hashSection === 'storage' && organizationId ? `/api/v1/organizations/${organizationId}/storage` : null;
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
    /** Saves the Organization avatar URL when focus leaves the setting. */
    async function saveAvatar() {
        setAvatarError(null);

        // Ignore unavailable, unauthorized, and unchanged Organizations.
        if (!organizationDetails || !canManageOrganization) {
            return;
        }
        const normalizedAvatar = avatar.trim();
        if (normalizedAvatar === organizationAvatar) {
            return;
        }

        // Require an empty value or an HTTP(S) URL.
        if (!organizationAvatarSchema.safeParse(normalizedAvatar).success) {
            setAvatarError('Enter a valid HTTP(S) avatar URL.');
            return;
        }

        // Persist the setting and retain the normalized server response.
        try {
            const updated = await updateOrganization.mutateAsync({ avatar: normalizedAvatar });
            setEditedAvatar(updated.avatar);
            toast({ body: 'Avatar saved' });
        } catch (mutationError) {
            toast({
                body: mutationError instanceof Error ? mutationError.message : 'Failed to update avatar',
                type: 'error',
            });
        }
    }

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
                            <Stack gap={1}>
                                <Heading level={2}>Organization</Heading>
                                <Text type="supporting">View and manage organization details.</Text>
                            </Stack>
                            <Stack direction="horizontal" gap={4} align="center" wrap="wrap">
                                <Avatar
                                    kind="organization"
                                    name={organizationName}
                                    size="lg"
                                    src={avatar || undefined}
                                />
                                <TextInput
                                    label="Avatar URL"
                                    value={avatar}
                                    width="100%"
                                    isOptional
                                    isDisabled={isLoading || updateOrganization.isPending || !canManageOrganization}
                                    placeholder="https://example.com/org.png"
                                    status={avatarError ? { type: 'error', message: avatarError } : undefined}
                                    onChange={(value) => {
                                        setEditedAvatar(value);
                                        setAvatarError(null);
                                    }}
                                    onBlur={() => {
                                        void saveAvatar();
                                    }}
                                />
                            </Stack>
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
                    {hasOrganizationApplicationAccess ? (
                        <>
                            <MenuItem icon="database" label="Database">
                                <Stack gap={4}>
                                    <Stack gap={1}>
                                        <Heading level={2}>Database</Heading>
                                        <Text type="supporting">Review database usage for this organization.</Text>
                                    </Stack>
                                    {isLoading || isDatabaseLoading ? null : error ? (
                                        <Banner status="error" title={error.message} />
                                    ) : databaseError ? (
                                        <Banner status="error" title={databaseError.message} />
                                    ) : databaseUsage === null || databaseUsage === undefined ? (
                                        <EmptyState title="No results." isCompact />
                                    ) : (
                                        <Table
                                            data={[{ name: 'PostgreSQL', usage: databaseUsage }]}
                                            density="compact"
                                            idKey="name"
                                        >
                                            <TableColumn<{ name: string; usage: number }>
                                                field="database"
                                                header="Database"
                                                width={proportional(2)}
                                            >
                                                {(database) => (
                                                    <Stack direction="horizontal" gap={3} align="center">
                                                        <PostgreSQL aria-hidden="true" className="size-6 shrink-0" />
                                                        <Text weight="semibold">{database.name}</Text>
                                                    </Stack>
                                                )}
                                            </TableColumn>
                                            <TableColumn<{ name: string; usage: number }>
                                                align="end"
                                                field="usage"
                                                header="Usage"
                                                width={proportional(1)}
                                            >
                                                {(database) => formatBytes(database.usage)}
                                            </TableColumn>
                                        </Table>
                                    )}
                                </Stack>
                            </MenuItem>
                            <MenuItem icon="hardDrive" label="Storage">
                                <Stack gap={4}>
                                    <Stack gap={1}>
                                        <Heading level={2}>Storage</Heading>
                                        <Text type="supporting">Review storage usage for this organization.</Text>
                                    </Stack>
                                    {isLoading || isStorageLoading ? null : error ? (
                                        <Banner status="error" title={error.message} />
                                    ) : storageError ? (
                                        <Banner status="error" title={storageError.message} />
                                    ) : storageUsage === null || storageUsage === undefined ? (
                                        <EmptyState title="No storage resources found." isCompact />
                                    ) : (
                                        <Table data={[storageUsage]} density="compact" idKey="bucket_name">
                                            <TableColumn<OrganizationStorageUsageResponse>
                                                field="storage"
                                                header="Storage"
                                                width={proportional(2)}
                                            >
                                                {(storage) => (
                                                    <Stack direction="horizontal" gap={3} align="center">
                                                        <S3 aria-hidden="true" className="shrink-0" />
                                                        <Text weight="semibold">{storage.bucket_name}</Text>
                                                    </Stack>
                                                )}
                                            </TableColumn>
                                            <TableColumn<OrganizationStorageUsageResponse>
                                                align="end"
                                                field="usage"
                                                header="Usage"
                                                width={proportional(1)}
                                            >
                                                {(storage) => formatBytes(storage.space_used)}
                                            </TableColumn>
                                        </Table>
                                    )}
                                </Stack>
                            </MenuItem>
                        </>
                    ) : null}
                </MenuSection>
            </Menu>
        </PageContainer>
    );
}
