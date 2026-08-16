import { z } from 'zod';
import { useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { useLocation, useParams } from 'react-router';
import { proportional } from '@astryxdesign/core/Table';
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import type { OrganizationStorageUsageResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { S3 } from '@/svg/S3';
import { Auth } from '@/components/Auth';
import { formatBytes } from '@/lib/utils';
import NotFound from '@/platform/NotFound';
import { useToast } from '@/lib/hooks/use-toast';
import { hasMinimumRole } from '@/lib/roles';
import { useApiQuery } from '@/lib/hooks/use-api';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { OrganizationLayout } from '@/platform/layouts/Organization';
import People from '@/components/settings/People';
import { platformApiPath } from '@/lib/platform-api';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import ApplicationSettings from '@/components/settings/ApplicationSettings';
import { useOrganization, useUpdateOrganization } from '@/lib/hooks/use-organization';
import { Menu, MenuItem, MenuSection, MenuSubSection } from '@/components/ui/Menu';
import { zOrganizationStorageUsageResponse } from '@/lib/generated/platform-api-v1/zod.gen';

type DatabaseUsage = { id: string; usage: number };

const organizationAvatarSchema = z.union([
    z.literal(''),
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
]);

/** Renders the organization owning a database or storage resource. */
function OrganizationOwner({ avatar, name }: { avatar: string; name: string }) {
    return (
        <HStack gap={3} align="center">
            <Avatar src={avatar} name={name} size="md" />
            <VStack gap={1}>
                <Text weight="semibold">{name}</Text>
                <Text type="supporting">Organization</Text>
            </VStack>
        </HStack>
    );
}

/** Renders the organization settings page. */
function OrganizationSettings() {
    const { organization = '' } = useParams();
    const toast = useToast();
    const location = useLocation();
    const {
        organization: organizationDetails,
        members,
        invitations,
        applications,
        role: organizationRole,
        isLoading,
        error,
    } = useOrganization(organization);
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const organizationId = organizationDetails?.id ?? '';
    const canManageOrganization = hasMinimumRole(organizationRole, 'admin');
    const updateOrganization = useUpdateOrganization(organizationId);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatar = editedAvatar ?? organizationAvatar;
    const hasOrganizationApplicationAccess = hasMinimumRole(organizationRole, 'maintain');
    const section =
        location.hash === '#applications'
            ? 'applications'
            : location.hash === '#database'
              ? 'database'
              : location.hash === '#storage'
                ? 'storage'
                : location.hash === '#invitations'
                  ? 'invitations'
                  : location.hash === '#members'
                    ? 'members'
                    : 'organization';
    const {
        data: databaseUsage,
        error: databaseError,
        isLoading: isDatabaseLoading,
    } = useApiQuery<number | null>(
        section === 'database' && organizationId ? platformApiPath(`/organizations/${organizationId}/database`) : null,
        {
            parse: (value) => z.int().gte(0).nullable().parse(value),
            retry: false,
        }
    );
    const databaseResourceError = error ?? databaseError;
    const {
        data: storageUsage,
        error: storageError,
        isLoading: isStorageLoading,
    } = useApiQuery<OrganizationStorageUsageResponse | null>(
        section === 'storage' && organizationId ? platformApiPath(`/organizations/${organizationId}/storage`) : null,
        {
            parse: (value) => zOrganizationStorageUsageResponse.nullable().parse(value),
            retry: false,
        }
    );
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
        return <NotFound />;
    }

    return (
        <OrganizationLayout organization={organization}>
            <PageContainer gap={8}>
                <Stack gap={1} width="100%">
                    <Heading level={1}>Settings</Heading>
                    <Text as="p" color="secondary">
                        Configure the organization and its runtime defaults.
                    </Text>
                </Stack>
                <Menu>
                    <MenuSection title="Settings" isHeaderHidden>
                        <MenuItem icon="building2" label="Organization">
                            <VStack gap={4}>
                                <VStack gap={1}>
                                    <Heading level={2}>Organization</Heading>
                                    <Text type="supporting">View and manage organization details.</Text>
                                </VStack>
                                <HStack gap={4} align="center" wrap="wrap">
                                    <Avatar src={avatar || undefined} name={organizationName} size="lg" />
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
                                </HStack>
                            </VStack>
                        </MenuItem>
                        <MenuSubSection icon="users" label="People">
                            <MenuItem label="Members">
                                <People
                                    organizationId={organizationId}
                                    members={members}
                                    invitations={invitations}
                                    activeSection="members"
                                    canInviteMembers={hasOrganizationApplicationAccess}
                                    canManageMembers={canManageOrganization}
                                    isLoading={isLoading}
                                    error={error}
                                />
                            </MenuItem>
                            <MenuItem label="Invitations">
                                <People
                                    organizationId={organizationId}
                                    members={members}
                                    invitations={invitations}
                                    activeSection="invitations"
                                    canInviteMembers={hasOrganizationApplicationAccess}
                                    canManageMembers={canManageOrganization}
                                    isLoading={isLoading}
                                    error={error}
                                />
                            </MenuItem>
                        </MenuSubSection>
                        <MenuItem icon="boxes" label="Applications">
                            <ApplicationSettings
                                organizationId={organizationId}
                                applications={applications}
                                canManageApplications={hasOrganizationApplicationAccess}
                                isLoading={isLoading}
                                error={error}
                            />
                        </MenuItem>
                        {hasOrganizationApplicationAccess ? (
                            <MenuItem icon="database" label="Database">
                                <VStack gap={4}>
                                    <VStack gap={1}>
                                        <Heading level={2}>Database</Heading>
                                        <Text type="supporting">Review database usage for this organization.</Text>
                                    </VStack>
                                    {isLoading || isDatabaseLoading ? null : databaseResourceError ? (
                                        <Banner status="error" title={databaseResourceError.message} />
                                    ) : databaseUsage === null || databaseUsage === undefined ? (
                                        <EmptyState title="No results." isCompact />
                                    ) : (
                                        <Table
                                            data={[{ id: 'database', usage: databaseUsage }]}
                                            density="compact"
                                            hasHover
                                            idKey="id"
                                        >
                                            <TableColumn<DatabaseUsage>
                                                field="usage"
                                                header="Resource"
                                                width={proportional(1)}
                                            >
                                                {(resource) => (
                                                    <HStack gap={3} align="center">
                                                        <PostgreSQL aria-hidden="true" className="size-6 shrink-0" />
                                                        <VStack gap={1}>
                                                            <Text weight="semibold">PostgreSQL</Text>
                                                            <Text type="supporting">{formatBytes(resource.usage)}</Text>
                                                        </VStack>
                                                    </HStack>
                                                )}
                                            </TableColumn>
                                            <TableColumn<DatabaseUsage>
                                                field="owner"
                                                header="Owner"
                                                width={proportional(1)}
                                            >
                                                {() => (
                                                    <OrganizationOwner
                                                        avatar={organizationAvatar}
                                                        name={organizationName}
                                                    />
                                                )}
                                            </TableColumn>
                                        </Table>
                                    )}
                                </VStack>
                            </MenuItem>
                        ) : null}
                        {hasOrganizationApplicationAccess ? (
                            <MenuItem icon="hardDrive" label="Storage">
                                <VStack gap={4}>
                                    <VStack gap={1}>
                                        <Heading level={2}>Storage</Heading>
                                        <Text type="supporting">Review storage usage for this organization.</Text>
                                    </VStack>
                                    {isLoading || isStorageLoading ? null : error ? (
                                        <Banner status="error" title={error.message} />
                                    ) : storageError ? (
                                        <Banner status="error" title={storageError.message} />
                                    ) : (
                                        <Table
                                            data={storageUsage ? [storageUsage] : []}
                                            density="compact"
                                            emptyState={<EmptyState title="No storage resources found." isCompact />}
                                            hasHover
                                            idKey="bucket_name"
                                        >
                                            <TableColumn<OrganizationStorageUsageResponse>
                                                field="bucket_name"
                                                header="Resource"
                                                width={proportional(1)}
                                            >
                                                {(resource) => (
                                                    <HStack gap={3} align="center">
                                                        <S3 aria-hidden="true" className="shrink-0" />
                                                        <VStack gap={1}>
                                                            <Text weight="semibold">{resource.bucket_name}</Text>
                                                            <Text type="supporting">
                                                                {formatBytes(resource.space_used)}
                                                            </Text>
                                                        </VStack>
                                                    </HStack>
                                                )}
                                            </TableColumn>
                                            <TableColumn<OrganizationStorageUsageResponse>
                                                field="owner"
                                                header="Owner"
                                                width={proportional(1)}
                                            >
                                                {() => (
                                                    <OrganizationOwner
                                                        avatar={organizationAvatar}
                                                        name={organizationName}
                                                    />
                                                )}
                                            </TableColumn>
                                        </Table>
                                    )}
                                </VStack>
                            </MenuItem>
                        ) : null}
                    </MenuSection>
                </Menu>
            </PageContainer>
        </OrganizationLayout>
    );
}

/** Protects the organization settings page. */
export default function OrganizationSettingsRoute() {
    return (
        <Auth>
            <OrganizationSettings />
        </Auth>
    );
}
