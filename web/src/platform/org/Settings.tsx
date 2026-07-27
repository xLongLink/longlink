import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Boxes, Building2, Database, HardDrive, Users, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { z } from 'zod';
import { useOrganizationDatabaseResources, useOrganizationStorageResources } from '@/data/organization';
import { useUpdateOrganization } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user';
import { hasMinimumRole, type Role } from '@/lib/roles';
import type {
    ApiInvitation,
    ApiOrganizationApplication,
    ApiOrganizationDatabaseResource,
    ApiOrganizationMember,
    ApiOrganizationStorageResource,
    ApiOrganizationSummary,
} from '@/lib/types';
import { formatBytes, formatNumber } from '@/lib/utils';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { S3 } from '@/svg/S3';
import ApplicationSettings from './ApplicationSettings';
import People from './People';

type SettingsProps = {
    organization: string;
    organizationDetails: ApiOrganizationSummary | undefined;
    applications: ApiOrganizationApplication[];
    members: ApiOrganizationMember[];
    invitations: ApiInvitation[];
    organizationRole: Role | null;
    routeSection: SettingsRouteSection;
    isLoading: boolean;
    error: Error | null;
};

type PeopleSection = 'members' | 'invitations';
export type SettingsRouteSection = 'organization' | 'applications' | 'people' | 'database' | 'storage';
type SettingsSection = Exclude<SettingsRouteSection, 'people'> | PeopleSection;

const organizationAvatarSchema = z.union([
    z.literal(''),
    z.url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol)),
]);

/** Renders database resources while the database settings section is active. */
function DatabaseSettings({
    organizationId,
    columns,
    isOrganizationLoading,
}: {
    organizationId: string;
    columns: TableColumn<ApiOrganizationDatabaseResource>[];
    isOrganizationLoading: boolean;
}) {
    const t = useTranslator();
    const { items, error, isLoading } = useOrganizationDatabaseResources(organizationId);

    return (
        <VStack gap={4}>
            <VStack gap={1}>
                <Heading level={2}>{t('navigation.database')}</Heading>
                <Text type="supporting">{t('organizationSettings.reviewDatabase')}</Text>
            </VStack>
            {(isOrganizationLoading || isLoading) && items.length === 0 ? null : error && items.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={items}
                    density="compact"
                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                    hasHover
                    idKey="name"
                />
            )}
        </VStack>
    );
}

/** Renders storage resources while the storage settings section is active. */
function StorageSettings({
    organizationId,
    columns,
    isOrganizationLoading,
}: {
    organizationId: string;
    columns: TableColumn<ApiOrganizationStorageResource>[];
    isOrganizationLoading: boolean;
}) {
    const t = useTranslator();
    const { items, error, isLoading } = useOrganizationStorageResources(organizationId);

    return (
        <VStack gap={4}>
            <VStack gap={1}>
                <Heading level={2}>{t('navigation.storage')}</Heading>
                <Text type="supporting">{t('organizationSettings.reviewStorage')}</Text>
            </VStack>
            {(isOrganizationLoading || isLoading) && items.length === 0 ? null : error && items.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={items}
                    density="compact"
                    emptyState={<EmptyState title={t('resources.noStorageResources')} isCompact />}
                    hasHover
                    idKey="prefix"
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
}: SettingsProps) {
    const t = useTranslator();
    const toast = useToast();
    const location = useLocation();
    const { role: platformRole } = useUserProfile();
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const organizationId = organizationDetails?.id ?? '';
    const canManageOrganization = hasMinimumRole(organizationRole, 'admin');
    const updateOrganization = useUpdateOrganization(organizationId, canManageOrganization);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const avatar = editedAvatar ?? organizationAvatar;
    const hasOrganizationApplicationAccess = hasMinimumRole(organizationRole, 'maintain');
    const canManageOrganizationMembers = hasMinimumRole(organizationRole, 'admin');
    const hashValue = location.hash.replace(/^#/, '');
    const peopleSection: PeopleSection = hashValue === 'invitations' ? 'invitations' : 'members';
    const section: SettingsSection = routeSection === 'people' ? peopleSection : routeSection;
    const databaseColumns: TableColumn<ApiOrganizationDatabaseResource>[] = [
        {
            key: 'resource',
            header: t('columns.resource'),
            width: proportional(1),
            renderCell: (resource) => (
                <HStack gap={3} align="center">
                    <PostgreSQL aria-hidden="true" className="size-6 shrink-0" />
                    <VStack gap={1}>
                        <Text weight="semibold">{resource.name}</Text>
                        <Text type="supporting">
                            {resource.space_used === null ? t('common.unknown') : formatBytes(resource.space_used)} ·{' '}
                            {resource.table_count === null
                                ? t('resources.unknownTables')
                                : t('resources.tableCount', { count: formatNumber(resource.table_count) })}
                        </Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'application',
            header: t('columns.owner'),
            width: proportional(1),
            renderCell: (resource) => {
                // Show organization ownership for the shared schema.
                if (resource.name === 'shared') {
                    return (
                        <HStack gap={3} align="center">
                            <Avatar src={organizationAvatar} name={organizationName} size="md" />
                            <VStack gap={1}>
                                <Text weight="semibold">{organizationName}</Text>
                                <Text type="supporting">{t('columns.organization')}</Text>
                            </VStack>
                        </HStack>
                    );
                }

                // Mark orphaned resources without an active application.
                if (resource.application === null) {
                    return <Text type="supporting">{t('organizationSettings.noActiveApp')}</Text>;
                }

                return (
                    <HStack gap={3} align="center">
                        <Wrench aria-hidden="true" className="shrink-0 text-accent" size={20} />
                        <VStack gap={1}>
                            <Link href={`/orgs/${organization}/apps/${resource.application.slug}`} weight="semibold">
                                {resource.application.name}
                            </Link>
                            {resource.application.description ? (
                                <Text type="supporting">{resource.application.description}</Text>
                            ) : null}
                        </VStack>
                    </HStack>
                );
            },
        },
    ];
    const storageColumns: TableColumn<ApiOrganizationStorageResource>[] = [
        {
            key: 'resource',
            header: t('columns.resource'),
            width: proportional(1),
            renderCell: (resource) => (
                <HStack gap={3} align="center">
                    <S3 aria-hidden="true" className="shrink-0" />
                    <VStack gap={1}>
                        <Text weight="semibold">
                            {resource.kind === 'shared_prefix' ? t('resources.shared') : resource.name}
                        </Text>
                        <Text type="supporting">
                            {resource.space_used === null ? t('common.unknown') : formatBytes(resource.space_used)} ·{' '}
                            {resource.object_count === null
                                ? t('resources.unknownObjects')
                                : t('resources.objectCount', { count: formatNumber(resource.object_count) })}
                        </Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'application',
            header: t('columns.owner'),
            width: proportional(1),
            renderCell: (resource) => {
                // Show organization ownership for the shared prefix.
                if (resource.kind === 'shared_prefix') {
                    return (
                        <HStack gap={3} align="center">
                            <Avatar src={organizationAvatar} name={organizationName} size="md" />
                            <VStack gap={1}>
                                <Text weight="semibold">{organizationName}</Text>
                                <Text type="supporting">{t('columns.organization')}</Text>
                            </VStack>
                        </HStack>
                    );
                }

                // Mark orphaned resources without an active application.
                if (resource.application === null) {
                    return <Text type="supporting">{t('organizationSettings.noActiveApp')}</Text>;
                }

                return (
                    <HStack gap={3} align="center">
                        <Wrench aria-hidden="true" className="shrink-0 text-accent" size={20} />
                        <VStack gap={1}>
                            <Link href={`/orgs/${organization}/apps/${resource.application.slug}`} weight="semibold">
                                {resource.application.name}
                            </Link>
                            {resource.application.description ? (
                                <Text type="supporting">{resource.application.description}</Text>
                            ) : null}
                        </VStack>
                    </HStack>
                );
            },
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
                        canManageMembers={canManageOrganizationMembers}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}

                {section === 'applications' ? (
                    <ApplicationSettings
                        organization={organization}
                        organizationId={organizationId}
                        applications={applications}
                        platformRole={platformRole}
                        canManageApplications={hasOrganizationApplicationAccess}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}

                {section === 'database' ? (
                    <DatabaseSettings
                        organizationId={organizationId}
                        columns={databaseColumns}
                        isOrganizationLoading={isLoading}
                    />
                ) : null}

                {section === 'storage' ? (
                    <StorageSettings
                        organizationId={organizationId}
                        columns={storageColumns}
                        isOrganizationLoading={isLoading}
                    />
                ) : null}
            </div>
        </div>
    );
}
