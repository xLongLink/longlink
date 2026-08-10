import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Boxes, Building2, Database, HardDrive, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { z } from 'zod';
import { useApiQuery } from '@/hooks/use-api';
import { useUpdateOrganization } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';
import type {
    OrganizationApplicationSummary,
    OrganizationDatabaseUsageResponse,
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
    OrganizationStorageUsageResponse,
    OrganizationSummary,
} from '@/lib/generated/platform-api-v1/types.gen';
import {
    zOrganizationDatabaseUsageResponse,
    zOrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { hasMinimumRole, type Role } from '@/lib/roles';
import { formatBytes, numberFormatter } from '@/lib/utils';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { S3 } from '@/svg/S3';
import ApplicationSettings from './ApplicationSettings';
import People from './People';

type PeopleSection = 'members' | 'invitations';
export type SettingsRouteSection = 'organization' | 'applications' | 'people' | 'database' | 'storage';

const organizationAvatarSchema = z.union([
    z.literal(''),
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
]);

/** Renders a resource usage table in common Organization settings framing. */
function ResourceSettings<T extends Record<string, unknown>>({
    columns,
    description,
    emptyState,
    idKey,
    isOrganizationLoading,
    organizationError,
    organizationId,
    parse,
    resource,
    title,
}: {
    columns: TableColumn<T>[];
    description: string;
    emptyState: ReactNode;
    idKey: keyof T & string;
    isOrganizationLoading: boolean;
    organizationError: Error | null;
    organizationId: string;
    parse: (value: unknown) => T | null;
    resource: 'database' | 'storage';
    title: string;
}) {
    const { data, error, isLoading } = useApiQuery<T | null>(
        organizationId ? platformApiPath(`/organizations/${organizationId}/${resource}`) : null,
        {
            parse,
            retry: false,
        }
    );
    const resourceError = organizationError ?? error;

    return (
        <VStack gap={4}>
            <VStack gap={1}>
                <Heading level={2}>{title}</Heading>
                <Text type="supporting">{description}</Text>
            </VStack>
            {isOrganizationLoading || isLoading ? null : resourceError ? (
                <Banner status="error" title={resourceError.message} />
            ) : (
                <Table
                    columns={columns}
                    data={data ? [data] : []}
                    density="compact"
                    emptyState={emptyState}
                    hasHover
                    idKey={idKey}
                />
            )}
        </VStack>
    );
}

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
    const t = useTranslator();
    const toast = useToast();
    const location = useLocation();
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const organizationId = organizationDetails?.id ?? '';
    const canManageOrganization = hasMinimumRole(organizationRole, 'admin');
    const updateOrganization = useUpdateOrganization(organizationId, canManageOrganization);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatar = editedAvatar ?? organizationAvatar;
    const hasOrganizationApplicationAccess = hasMinimumRole(organizationRole, 'maintain');
    const peopleSection: PeopleSection = location.hash.replace(/^#/, '') === 'invitations' ? 'invitations' : 'members';
    const section = routeSection === 'people' ? peopleSection : routeSection;
    const ownerCell = (
        <HStack gap={3} align="center">
            <Avatar src={organizationAvatar} name={organizationName} size="md" />
            <VStack gap={1}>
                <Text weight="semibold">{organizationName}</Text>
                <Text type="supporting">{t('columns.organization')}</Text>
            </VStack>
        </HStack>
    );
    const databaseColumns: TableColumn<OrganizationDatabaseUsageResponse>[] = [
        {
            key: 'resource',
            header: t('columns.resource'),
            width: proportional(1),
            renderCell: (resource) => (
                <HStack gap={3} align="center">
                    <PostgreSQL aria-hidden="true" className="size-6 shrink-0" />
                    <VStack gap={1}>
                        <Text weight="semibold">{resource.database_name}</Text>
                        <Text type="supporting">
                            {formatBytes(resource.space_used)} ·{' '}
                            {t('resources.tableCount', { count: numberFormatter.format(resource.table_count) })}
                        </Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'owner',
            header: t('columns.owner'),
            width: proportional(1),
            renderCell: () => ownerCell,
        },
    ];
    const storageColumns: TableColumn<OrganizationStorageUsageResponse>[] = [
        {
            key: 'resource',
            header: t('columns.resource'),
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
            header: t('columns.owner'),
            width: proportional(1),
            renderCell: () => ownerCell,
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
            setAvatarError(t('organizationSettings.avatarInvalid'));
            return;
        }

        // Persist the setting and retain the normalized server response.
        try {
            const updated = await updateOrganization.mutateAsync({ avatar: normalizedAvatar });
            setEditedAvatar(updated.avatar);
            toast({ body: t('organizationSettings.avatarSaved') });
        } catch (mutationError) {
            toast({
                body:
                    mutationError instanceof Error
                        ? mutationError.message
                        : t('organizationSettings.failedUpdateAvatar'),
                type: 'error',
            });
        }
    }

    return (
        <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
            <SideNav className="h-auto w-full">
                <SideNavSection title={t('navigation.settings')} isHeaderHidden>
                    <SideNavItem
                        href={`/orgs/${organization}/settings`}
                        icon={<Building2 aria-hidden="true" size={16} />}
                        isSelected={section === 'organization'}
                        label={t('columns.organization')}
                    />
                    <SideNavItem
                        collapsible
                        icon={<Users aria-hidden="true" size={16} />}
                        isSelected={section === 'members' || section === 'invitations'}
                        label={t('navigation.people')}
                    >
                        <SideNavItem
                            href={`/orgs/${organization}/settings/people#members`}
                            isSelected={section === 'members'}
                            label={t('people.membersTitle')}
                        />
                        <SideNavItem
                            href={`/orgs/${organization}/settings/people#invitations`}
                            isSelected={section === 'invitations'}
                            label={t('people.invitationsTitle')}
                        />
                    </SideNavItem>
                    <SideNavItem
                        href={`/orgs/${organization}/settings/applications`}
                        icon={<Boxes aria-hidden="true" size={16} />}
                        isSelected={section === 'applications'}
                        label={t('navigation.applications')}
                    />
                    {hasOrganizationApplicationAccess ? (
                        <>
                            <SideNavItem
                                href={`/orgs/${organization}/settings/database`}
                                icon={<Database aria-hidden="true" size={16} />}
                                isSelected={section === 'database'}
                                label={t('navigation.database')}
                            />
                            <SideNavItem
                                href={`/orgs/${organization}/settings/storage`}
                                icon={<HardDrive aria-hidden="true" size={16} />}
                                isSelected={section === 'storage'}
                                label={t('navigation.storage')}
                            />
                        </>
                    ) : null}
                </SideNavSection>
            </SideNav>

            <div className="min-w-0">
                {section === 'organization' ? (
                    <VStack gap={4}>
                        <VStack gap={1}>
                            <Heading level={2}>{t('columns.organization')}</Heading>
                            <Text type="supporting">{t('organizationSettings.organizationDescription')}</Text>
                        </VStack>
                        <HStack gap={4} align="center" wrap="wrap">
                            <Avatar src={avatar || undefined} name={organizationName} size="lg" />
                            <TextInput
                                label={t('organizationSettings.avatarLabel')}
                                value={avatar}
                                width="100%"
                                isOptional
                                isDisabled={isLoading || updateOrganization.isPending || !canManageOrganization}
                                placeholder={t('organizationSettings.avatarPlaceholder')}
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
                    <ResourceSettings<OrganizationDatabaseUsageResponse>
                        columns={databaseColumns}
                        description={t('organizationSettings.reviewDatabase')}
                        emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                        idKey="database_name"
                        isOrganizationLoading={isLoading}
                        organizationError={error}
                        organizationId={organizationId}
                        parse={(value) => zOrganizationDatabaseUsageResponse.nullable().parse(value)}
                        resource="database"
                        title={t('navigation.database')}
                    />
                ) : null}

                {section === 'storage' ? (
                    <ResourceSettings<OrganizationStorageUsageResponse>
                        columns={storageColumns}
                        description={t('organizationSettings.reviewStorage')}
                        emptyState={<EmptyState title={t('resources.noStorageResources')} isCompact />}
                        idKey="bucket_name"
                        isOrganizationLoading={isLoading}
                        organizationError={error}
                        organizationId={organizationId}
                        parse={(value) => zOrganizationStorageUsageResponse.nullable().parse(value)}
                        resource="storage"
                        title={t('navigation.storage')}
                    />
                ) : null}
            </div>
        </div>
    );
}
