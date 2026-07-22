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
import { useNavigate, useParams } from 'react-router';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { useTranslator } from '@astryxdesign/core/i18n';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { ApiApplicationMember, ApiOrganizationApplication } from '@/lib/types';
import Logs from '@/components/dialogs/Logs';
import { useApiQuery } from '@/hooks/use-api';
import { apiQueryKey, fetchApiVoid } from '@/lib/api';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { useDeleteOrganizationApplication } from '@/hooks/use-organization';
import { apiApplicationMemberSchema, parseApiCollection } from '@/lib/api-schemas';
import { APPLICATION_ROLE_NAMES, hasMinimumRole, type ApplicationRole, type PlatformRole } from '@/lib/roles';

type ApplicationSettingsProps = {
    organization: string;
    organizationId: string;
    applications: ApiOrganizationApplication[];
    platformRole: PlatformRole;
    canManageApplications: boolean;
    isLoading: boolean;
    error: Error | null;
};

/** Renders organization application management and permissions. */
export default function ApplicationSettings({
    organization,
    organizationId,
    applications,
    platformRole,
    canManageApplications,
    isLoading,
    error,
}: ApplicationSettingsProps) {
    const t = useTranslator();
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { settingsApplication = '' } = useParams();
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [logsTarget, setLogsTarget] = useState<ApiOrganizationApplication | null>(null);
    const deleteApplication = useDeleteOrganizationApplication(organizationId);
    const deleteTarget = applications.find((application) => application.id === deleteTargetId) ?? null;
    const selectedApplication = applications.find((application) => application.slug === settingsApplication) ?? null;
    const applicationMembersPath = selectedApplication ? `/api/applications/${selectedApplication.id}/members` : null;
    const organizationDetailsPath = organizationId ? `/api/organizations/${organizationId}` : null;
    const applicationMembersQuery = useApiQuery<ApiApplicationMember[]>(applicationMembersPath, {
        parse: (value) => parseApiCollection(apiApplicationMemberSchema, value),
        retry: false,
    });
    const applicationMembers = applicationMembersQuery.data ?? [];
    const canManageSelectedApplication = selectedApplication
        ? hasMinimumRole(selectedApplication.role, 'maintain') || canManageApplications
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
                const canManageApplication = hasMinimumRole(application.role, 'maintain') || canManageApplications;
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

    return (
        <>
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
                            <Text type="supporting">{t('organizationSettings.cannotChangePermissions')}</Text>
                        ) : null}
                    </VStack>
                    {!selectedApplication ? (
                        <CreateApplication organizationId={organizationId} canCreate={canManageApplications} />
                    ) : null}
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
                            emptyState={<EmptyState title={t('resources.noOrganizationMembers')} isCompact />}
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
                        emptyState={<EmptyState title={t('organizationSettings.noApplications')} isCompact />}
                        hasHover
                        idKey="id"
                    />
                )}
            </VStack>

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
                isActionLoading={deleteApplication.isPending}
                onAction={async () => {
                    // Ignore submits without a selected target.
                    if (deleteTargetId === null) {
                        return;
                    }

                    const id = deleteTargetId;

                    // Delete the application and clear local dialog state.
                    try {
                        await deleteApplication.mutateAsync(id);

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
