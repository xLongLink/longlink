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
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { AppWindow, Boxes, Building2, Database, HardDrive, Settings2, Users } from 'lucide-react';
import type { OrganizationStorageUsageResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { S3 } from '@/svg/S3';
import { formatBytes } from '@/lib/utils';
import NotFound from '@/platform/NotFound';
import { useToast } from '@/hooks/use-toast';
import { hasMinimumRole } from '@/lib/roles';
import { useApiQuery } from '@/hooks/use-api';
import { PostgreSQL } from '@/svg/PostgreSQL';
import PlatformLayout from '@/platform/layout';
import People from '@/components/settings/People';
import { platformApiPath } from '@/lib/platform-api';
import { PageContainer } from '@/components/PageContainer';
import ApplicationSettings from '@/components/settings/ApplicationSettings';
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organization';
import { Menu, MenuItem, MenuSection, MenuSubSection } from '@/components/ui/Menu';
import { zOrganizationStorageUsageResponse } from '@/lib/generated/platform-api-v1/zod.gen';

type DatabaseUsage = { id: string; usage: number };

const organizationAvatarSchema = z.union([
    z.literal(''),
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
]);

/** Renders the organization settings page. */
export default function OrganizationSettingsRoute() {
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
    const storageColumns: TableColumn<OrganizationStorageUsageResponse>[] = [
        {
            key: 'resource',
            header: 'Resource',
            width: proportional(1),
            renderCell: (resource) => (
                <HStack gap={3} align="center">
                    <S3 aria-hidden="true" className="shrink-0" />
                    <VStack gap={1}>
                        <Text weight="semibold">{resource.bucket_name}</Text>
                        <Text type="supporting">{formatBytes(resource.space_used)}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'owner',
            header: 'Owner',
            width: proportional(1),
            renderCell: () => (
                <HStack gap={3} align="center">
                    <Avatar src={organizationAvatar} name={organizationName} size="md" />
                    <VStack gap={1}>
                        <Text weight="semibold">{organizationName}</Text>
                        <Text type="supporting">Organization</Text>
                    </VStack>
                </HStack>
            ),
        },
    ];
    const databaseColumns: TableColumn<DatabaseUsage>[] = [
        {
            key: 'usage',
            header: 'Resource',
            width: proportional(1),
            renderCell: (resource) => (
                <HStack gap={3} align="center">
                    <PostgreSQL aria-hidden="true" className="size-6 shrink-0" />
                    <VStack gap={1}>
                        <Text weight="semibold">PostgreSQL</Text>
                        <Text type="supporting">{formatBytes(resource.usage)}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'owner',
            header: 'Owner',
            width: proportional(1),
            renderCell: () => (
                <HStack gap={3} align="center">
                    <Avatar src={organizationAvatar} name={organizationName} size="md" />
                    <VStack gap={1}>
                        <Text weight="semibold">{organizationName}</Text>
                        <Text type="supporting">Organization</Text>
                    </VStack>
                </HStack>
            ),
        },
    ];

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
        <PlatformLayout
            tabs={[
                { href: `/orgs/${organization}`, icon: AppWindow, label: 'Applications' },
                { href: `/orgs/${organization}/settings`, icon: Settings2, label: 'Settings' },
            ]}
        >
            <PageContainer gap={8}>
                <Stack gap={1} width="100%">
                    <Heading level={1}>Settings</Heading>
                    <Text as="p" color="secondary">
                        Configure the organization and its runtime defaults.
                    </Text>
                </Stack>
                <Menu className="h-auto w-full">
                    <MenuSection title="Settings" isHeaderHidden>
                        <MenuItem icon={<Building2 aria-hidden="true" size={16} />} label="Organization">
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
                        <MenuSubSection icon={<Users aria-hidden="true" size={16} />} label="People">
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
                        <MenuItem icon={<Boxes aria-hidden="true" size={16} />} label="Applications">
                            <ApplicationSettings
                                organizationId={organizationId}
                                applications={applications}
                                canManageApplications={hasOrganizationApplicationAccess}
                                isLoading={isLoading}
                                error={error}
                            />
                        </MenuItem>
                        {hasOrganizationApplicationAccess ? (
                            <MenuItem icon={<Database aria-hidden="true" size={16} />} label="Database">
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
                                            columns={databaseColumns}
                                            data={[{ id: 'database', usage: databaseUsage }]}
                                            density="compact"
                                            emptyState={<EmptyState title="No results." isCompact />}
                                            hasHover
                                            idKey="id"
                                        />
                                    )}
                                </VStack>
                            </MenuItem>
                        ) : null}
                        {hasOrganizationApplicationAccess ? (
                            <MenuItem icon={<HardDrive aria-hidden="true" size={16} />} label="Storage">
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
                                            columns={storageColumns}
                                            data={storageUsage ? [storageUsage] : []}
                                            density="compact"
                                            emptyState={<EmptyState title="No storage resources found." isCompact />}
                                            hasHover
                                            idKey="bucket_name"
                                        />
                                    )}
                                </VStack>
                            </MenuItem>
                        ) : null}
                    </MenuSection>
                </Menu>
            </PageContainer>
        </PlatformLayout>
    );
}
