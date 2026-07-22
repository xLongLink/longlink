import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { useTranslator } from '@astryxdesign/core/i18n';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Boxes, Building2, Database, HardDrive, Users } from 'lucide-react';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type {
    ApiApplicationMember,
    ApiInvitation,
    ApiOrganizationApplication,
    ApiOrganizationDatabaseResource,
    ApiOrganizationDetails,
    ApiOrganizationMemberSummary,
    ApiOrganizationStorageResource,
} from '@/lib/types';
import { S3 } from '@/svg/S3';
import Logs from '@/components/dialogs/Logs';
import { useApiQuery } from '@/hooks/use-api';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { useUserProfile } from '@/hooks/use-user';
import { apiQueryKey, fetchApiVoid } from '@/lib/api';
import { formatBytes, formatNumber } from '@/lib/utils';
import { useOrganizationActions } from '@/hooks/use-organization';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { apiApplicationMemberSchema, parseApiCollection } from '@/lib/api-schemas';
import { APPLICATION_ROLE_NAMES, hasMinimumRole, type ApplicationRole } from '@/lib/roles';
import { useOrganizationDatabaseResources, useOrganizationStorageResources } from '@/data/organization';
import People from './People';

type SettingsProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    applications: ApiOrganizationApplication[];
    people: ApiOrganizationMemberSummary[];
    invitations: ApiInvitation[];
    routeSection: SettingsRouteSection;
    isLoading: boolean;
    error: Error | null;
};

type PeopleSection = 'members' | 'invitations';
export type SettingsRouteSection = 'organization' | 'applications' | 'people' | 'database' | 'storage';
type SettingsSection = Exclude<SettingsRouteSection, 'people'> | PeopleSection;

/** Renders the organization settings page body. */
export default function Settings({
    organization,
    organizationDetails,
    applications,
    people,
    invitations,
    routeSection,
    isLoading,
    error,
}: SettingsProps) {
    const t = useTranslator();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const { settingsApplication = '' } = useParams();
    const { role: platformRole, organizations: userOrganizations } = useUserProfile();
    const queryClient = useQueryClient();
    const { deleteApplication, isDeletingApplication } = useOrganizationActions(organization);
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const {
        items: databaseResources,
        error: databaseResourcesError,
        isLoading: databaseResourcesIsLoading,
    } = useOrganizationDatabaseResources(organizationDetails?.id ?? '');
    const {
        items: storageResources,
        error: storageResourcesError,
        isLoading: storageResourcesIsLoading,
    } = useOrganizationStorageResources(organizationDetails?.id ?? '');
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [logsTarget, setLogsTarget] = useState<ApiOrganizationApplication | null>(null);

    const organizationMembership = userOrganizations.find((item) => item.slug === organization);
    const organizationRole = organizationMembership?.role ?? null;
    const hasOrganizationApplicationAccess = hasMinimumRole(organizationRole, 'maintain');
    const hashValue = location.hash.replace(/^#/, '');
    const peopleSection: PeopleSection = hashValue === 'invitations' ? 'invitations' : 'members';
    const section: SettingsSection = routeSection === 'people' ? peopleSection : routeSection;
    const deleteTarget = applications.find((application) => application.id === deleteTargetId) ?? null;
    const selectedApplication = applications.find((application) => application.slug === settingsApplication) ?? null;
    const applicationMembersPath = selectedApplication ? `/api/applications/${selectedApplication.id}/members` : null;
    const organizationDetailsPath = organizationDetails ? `/api/organizations/${organizationDetails.id}` : null;
    const applicationMembersQuery = useApiQuery<ApiApplicationMember[]>(applicationMembersPath, {
        parse: (value) => parseApiCollection(apiApplicationMemberSchema, value),
        retry: false,
    });
    const applicationMembers = applicationMembersQuery.data ?? [];
    const canManageSelectedApplication = selectedApplication
        ? hasMinimumRole(selectedApplication.role, 'maintain') || hasOrganizationApplicationAccess
        : false;

    const changeApplicationMemberRole = useMutation({
        mutationFn: async ({
            applicationId,
            memberId,
            role,
        }: {
            applicationId: string;
            memberId: string;
            role: ApplicationRole | null;
        }) => {
            await fetchApiVoid(`/api/applications/${applicationId}/members/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
        },
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: apiQueryKey(`/api/applications/${variables.applicationId}/members`),
            });

            // Refresh organization details when the route context exists.
            if (organizationDetailsPath !== null) {
                await queryClient.invalidateQueries({ queryKey: apiQueryKey(organizationDetailsPath) });
            }
        },
    });

    const appColumns: TableColumn<ApiOrganizationApplication>[] = [
        {
            key: 'name',
            header: t('columns.application'),
            width: proportional(1),
            renderCell: (application) => (
                <HStack gap={3} align="start">
                    <Icon icon="wrench" color="accent" />
                    <VStack gap={1}>
                        <Link
                            href={`/orgs/${organization}/settings/applications/${application.slug}`}
                            weight="semibold"
                        >
                            {application.name}
                        </Link>
                        {application.description ? <Text type="supporting">{application.description}</Text> : null}
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'action',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (application) => {
                const canManageApplication =
                    hasMinimumRole(application.role, 'maintain') || hasOrganizationApplicationAccess;
                const canReadLogs = platformRole === 'administrator' || canManageApplication;

                // Hide the action menu when no actions are available.
                if (!canReadLogs && !canManageApplication) {
                    return '—';
                }

                return (
                    <MoreMenu
                        label={t('common.openActionsFor', { name: application.name })}
                        size="sm"
                        items={[
                            ...(canReadLogs
                                ? [{ label: t('organizationSettings.logs'), onClick: () => setLogsTarget(application) }]
                                : []),
                            ...(canManageApplication
                                ? [
                                      {
                                          label: t('actions.delete'),
                                          onClick: () => {
                                              setDeleteTargetId(application.id);
                                          },
                                      },
                                  ]
                                : []),
                        ]}
                    />
                );
            },
        },
    ];
    const applicationMemberColumns: TableColumn<ApiApplicationMember>[] = [
        {
            key: 'member',
            header: t('columns.user'),
            width: proportional(1),
            renderCell: (member) => (
                <HStack gap={3} align="center">
                    <Avatar src={member.avatar} name={member.name} size="small" />
                    <VStack gap={1}>
                        <Text weight="semibold">{member.name}</Text>
                        <Text type="supporting">{member.email}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'organization_role',
            header: t('organizationSettings.organizationPermission'),
            width: pixel(208),
            renderCell: (member) => <Badge label={member.organization_role} />,
        },
        {
            key: 'application_role',
            header: t('organizationSettings.applicationPermission'),
            width: pixel(208),
            renderCell: (member) => {
                const value = member.application_role ?? 'none';

                return (
                    <Selector
                        label={t('organizationSettings.applicationPermission')}
                        isLabelHidden
                        width={176}
                        value={value}
                        options={[
                            { value: 'none', label: t('organizationSettings.noAppAccess') },
                            ...APPLICATION_ROLE_NAMES.map((role) => ({ value: role, label: role })),
                        ]}
                        isDisabled={!canManageSelectedApplication || changeApplicationMemberRole.isPending}
                        onChange={async (nextValue) => {
                            // Ignore changes without an active application.
                            if (selectedApplication === null) {
                                return;
                            }

                            const nextRole = nextValue === 'none' ? null : (nextValue as ApplicationRole);

                            // Skip updates when the role is unchanged.
                            if (nextRole === member.application_role) {
                                return;
                            }

                            // Persist the selected application role.
                            try {
                                await changeApplicationMemberRole.mutateAsync({
                                    applicationId: selectedApplication.id,
                                    memberId: member.id,
                                    role: nextRole,
                                });
                            } catch (mutationError) {
                                toast({
                                    body:
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : t('organizationSettings.failedChangeApplicationPermission'),
                                    type: 'error',
                                });
                            }
                        }}
                    />
                );
            },
        },
    ];
    const databaseColumns: TableColumn<ApiOrganizationDatabaseResource>[] = [
        {
            key: 'resource',
            header: t('columns.resource'),
            width: proportional(1),
            renderCell: (resource) => (
                <HStack gap={3} align="center">
                    <Icon icon={PostgreSQL} size="lg" />
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
                            <Avatar src={organizationAvatar} name={organizationName} size="small" />
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
                    <HStack gap={3} align="start">
                        <Icon icon="wrench" color="accent" />
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
                    <Icon icon={S3} size="lg" />
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
                            <Avatar src={organizationAvatar} name={organizationName} size="small" />
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
                    <HStack gap={3} align="start">
                        <Icon icon="wrench" color="accent" />
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

    return (
        <>
            <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
                <SideNav style={{ height: 'auto', width: '100%' }}>
                    <SideNavSection title={t('navigation.settings')} isHeaderHidden>
                        <SideNavItem
                            href={`/orgs/${organization}/settings`}
                            icon={Building2}
                            isSelected={section === 'organization'}
                            label={t('columns.organization')}
                        />
                        <SideNavItem
                            collapsible
                            icon={Users}
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
                            icon={Boxes}
                            isSelected={section === 'applications'}
                            label={t('navigation.applications')}
                        />
                        <SideNavItem
                            href={`/orgs/${organization}/settings/database`}
                            icon={Database}
                            isSelected={section === 'database'}
                            label={t('navigation.database')}
                        />
                        <SideNavItem
                            href={`/orgs/${organization}/settings/storage`}
                            icon={HardDrive}
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
                            <HStack gap={3} align="center">
                                <Avatar src={organizationAvatar} name={organizationName} size="small" />
                                <VStack gap={1}>
                                    <Text weight="semibold">{organizationName}</Text>
                                    <Text type="supporting">{organizationDetails?.country}</Text>
                                </VStack>
                            </HStack>
                        </VStack>
                    ) : null}

                    {section === 'members' || section === 'invitations' ? (
                        <People
                            organization={organization}
                            people={people}
                            invitations={invitations}
                            activeSection={section}
                            isLoading={isLoading}
                            error={error}
                        />
                    ) : null}

                    {section === 'applications' ? (
                        <VStack gap={4}>
                            <HStack gap={4} justify="between" align="end" wrap="wrap">
                                <VStack gap={1}>
                                    {selectedApplication ? (
                                        <Link href={`/orgs/${organization}/settings/applications`}>
                                            {t('organizationSettings.back')}
                                        </Link>
                                    ) : null}
                                    <Heading level={2}>
                                        {selectedApplication
                                            ? t('organizationSettings.applicationPermissionsTitle', {
                                                  name: selectedApplication.name,
                                              })
                                            : t('navigation.applications')}
                                    </Heading>
                                    {!selectedApplication ? (
                                        <Text type="supporting">{t('organizationSettings.reviewApplications')}</Text>
                                    ) : !canManageSelectedApplication ? (
                                        <Text type="supporting">
                                            {t('organizationSettings.cannotChangePermissions')}
                                        </Text>
                                    ) : null}
                                </VStack>
                                {!selectedApplication ? <CreateApplication organization={organization} /> : null}
                            </HStack>

                            {selectedApplication ? (
                                applicationMembersQuery.isLoading &&
                                applicationMembers.length === 0 ? null : applicationMembersQuery.error &&
                                  applicationMembers.length === 0 ? (
                                    <Banner status="error" title={applicationMembersQuery.error.message} />
                                ) : (
                                    <Table
                                        columns={applicationMemberColumns}
                                        data={applicationMembers}
                                        density="compact"
                                        emptyState={
                                            <EmptyState title={t('resources.noOrganizationMembers')} isCompact />
                                        }
                                        hasHover
                                        idKey="id"
                                    />
                                )
                            ) : isLoading && applications.length === 0 ? null : error && applications.length === 0 ? (
                                <Banner status="error" title={t('organizationSettings.loadApplicationsFailed')} />
                            ) : (
                                <Table
                                    columns={appColumns}
                                    data={applications}
                                    density="compact"
                                    emptyState={
                                        <EmptyState title={t('organizationSettings.noApplications')} isCompact />
                                    }
                                    hasHover
                                    idKey="id"
                                />
                            )}
                        </VStack>
                    ) : null}

                    {section === 'database' ? (
                        <VStack gap={4}>
                            <VStack gap={1}>
                                <Heading level={2}>{t('navigation.database')}</Heading>
                                <Text type="supporting">{t('organizationSettings.reviewDatabase')}</Text>
                            </VStack>
                            {(isLoading || databaseResourcesIsLoading) &&
                            databaseResources.length === 0 ? null : databaseResourcesError &&
                              databaseResources.length === 0 ? (
                                <Banner status="error" title={databaseResourcesError.message} />
                            ) : (
                                <Table
                                    columns={databaseColumns}
                                    data={databaseResources}
                                    density="compact"
                                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                                    hasHover
                                    idKey="name"
                                />
                            )}
                        </VStack>
                    ) : null}

                    {section === 'storage' ? (
                        <VStack gap={4}>
                            <VStack gap={1}>
                                <Heading level={2}>{t('navigation.storage')}</Heading>
                                <Text type="supporting">{t('organizationSettings.reviewStorage')}</Text>
                            </VStack>
                            {(isLoading || storageResourcesIsLoading) &&
                            storageResources.length === 0 ? null : storageResourcesError &&
                              storageResources.length === 0 ? (
                                <Banner status="error" title={storageResourcesError.message} />
                            ) : (
                                <Table
                                    columns={storageColumns}
                                    data={storageResources}
                                    density="compact"
                                    emptyState={<EmptyState title={t('resources.noStorageResources')} isCompact />}
                                    hasHover
                                    idKey="prefix"
                                />
                            )}
                        </VStack>
                    ) : null}
                </div>
            </div>

            {logsTarget ? (
                <Logs
                    applicationId={logsTarget.id}
                    applicationName={logsTarget.name}
                    open={logsTarget !== null}
                    onOpenChange={(open) => {
                        // Clear the selected log target when closing.
                        if (!open) {
                            setLogsTarget(null);
                        }
                    }}
                />
            ) : null}

            <AlertDialog
                isOpen={deleteTargetId !== null}
                onOpenChange={(open) => {
                    // Reset delete dialog state when closing.
                    if (!open) {
                        setDeleteTargetId(null);
                    }
                }}
                title={t('organizationSettings.deleteApplicationTitle')}
                description={
                    deleteTarget
                        ? t('organizationSettings.deleteApplicationDescription', { name: deleteTarget.name })
                        : t('organizationSettings.deleteApplicationFallback')
                }
                cancelLabel={t('actions.cancel')}
                actionLabel={t('actions.delete')}
                isActionLoading={isDeletingApplication}
                onAction={async () => {
                    // Ignore submits without a selected target.
                    if (deleteTargetId === null) {
                        return;
                    }

                    const id = deleteTargetId;

                    // Delete the application and clear local dialog state.
                    try {
                        await deleteApplication(id);

                        // Leave the detail view if it was deleted.
                        if (selectedApplication?.id === id) {
                            navigate(`/orgs/${organization}/settings/applications`);
                        }
                        setDeleteTargetId(null);
                    } catch (mutationError) {
                        toast({
                            body:
                                mutationError instanceof Error
                                    ? mutationError.message
                                    : t('organizationSettings.failedDeleteApplication'),
                            type: 'error',
                        });
                    }
                }}
            />
        </>
    );
}
