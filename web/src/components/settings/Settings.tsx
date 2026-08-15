import { z } from 'zod';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Boxes, Building2, Database, HardDrive, Users } from 'lucide-react';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import type {
    OrganizationApplicationSummary,
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
    OrganizationStorageUsageResponse,
    OrganizationSummary,
} from '@/lib/generated/platform-api-v1/types.gen';
import { S3 } from '@/svg/S3';
import { formatBytes } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useApiQuery } from '@/hooks/use-api';
import { PostgreSQL } from '@/svg/PostgreSQL';
import People from '@/components/settings/People';
import { platformApiPath } from '@/lib/platform-api';
import { hasMinimumRole, type Role } from '@/lib/roles';
import { useUpdateOrganization } from '@/hooks/use-organization';
import ApplicationSettings from '@/components/settings/ApplicationSettings';
import { zOrganizationStorageUsageResponse } from '@/lib/generated/platform-api-v1/zod.gen';

type PeopleSection = 'members' | 'invitations';
type DatabaseUsage = { id: string; usage: number };
export type SettingsRouteSection = 'organization' | 'applications' | 'people' | 'database' | 'storage';

const organizationAvatarSchema = z.union([
    z.literal(''),
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
]);

/** Renders the organization settings page body. */
export default function Settings({
    organization,
    organizationDetails,
    applications,
    members,
    invitations,
    organizationRole,
    routeSection,
    isLoading,
    error,
}: {
    organization: string;
    organizationDetails: OrganizationSummary | undefined;
    applications: OrganizationApplicationSummary[];
    members: OrganizationMemberAccessResponse[];
    invitations: OrganizationInvitationResponse[];
    organizationRole: Role | null;
    routeSection: SettingsRouteSection;
    isLoading: boolean;
    error: Error | null;
}) {
    const toast = useToast();
    const location = useLocation();
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const organizationId = organizationDetails?.id ?? '';
    const canManageOrganization = hasMinimumRole(organizationRole, 'admin');
    const updateOrganization = useUpdateOrganization(organizationId);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatar = editedAvatar ?? organizationAvatar;
    const hasOrganizationApplicationAccess = hasMinimumRole(organizationRole, 'maintain');
    const peopleSection: PeopleSection = location.hash.replace(/^#/, '') === 'invitations' ? 'invitations' : 'members';
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
                    : routeSection === 'people'
                      ? peopleSection
                      : routeSection;
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

    return (
        <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <SideNav className="h-auto w-full">
                <SideNavSection title="Settings" isHeaderHidden>
                    <SideNavItem
                        href={`/orgs/${organization}/settings`}
                        icon={<Building2 aria-hidden="true" size={16} />}
                        isSelected={section === 'organization'}
                        label="Organization"
                    />
                    <SideNavItem
                        collapsible
                        icon={<Users aria-hidden="true" size={16} />}
                        isSelected={section === 'members' || section === 'invitations'}
                        label="People"
                    >
                        <SideNavItem
                            href={`/orgs/${organization}/settings#members`}
                            isSelected={section === 'members'}
                            label="Members"
                        />
                        <SideNavItem
                            href={`/orgs/${organization}/settings#invitations`}
                            isSelected={section === 'invitations'}
                            label="Invitations"
                        />
                    </SideNavItem>
                    <SideNavItem
                        href={`/orgs/${organization}/settings#applications`}
                        icon={<Boxes aria-hidden="true" size={16} />}
                        isSelected={section === 'applications'}
                        label="Applications"
                    />
                    {hasOrganizationApplicationAccess ? (
                        <>
                            <SideNavItem
                                href={`/orgs/${organization}/settings#database`}
                                icon={<Database aria-hidden="true" size={16} />}
                                isSelected={section === 'database'}
                                label="Database"
                            />
                            <SideNavItem
                                href={`/orgs/${organization}/settings#storage`}
                                icon={<HardDrive aria-hidden="true" size={16} />}
                                isSelected={section === 'storage'}
                                label="Storage"
                            />
                        </>
                    ) : null}
                </SideNavSection>
            </SideNav>

            <div className="min-w-0">
                {section === 'organization' ? (
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
                ) : null}

                {section === 'members' || section === 'invitations' ? (
                    <People
                        organizationId={organizationId}
                        members={members}
                        invitations={invitations}
                        activeSection={section}
                        canInviteMembers={hasOrganizationApplicationAccess}
                        canManageMembers={canManageOrganization}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}

                {section === 'applications' ? (
                    <ApplicationSettings
                        organizationId={organizationId}
                        applications={applications}
                        canManageApplications={hasOrganizationApplicationAccess}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}

                {section === 'database' ? (
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
                ) : null}

                {section === 'storage' ? (
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
                ) : null}
            </div>
        </div>
    );
}
