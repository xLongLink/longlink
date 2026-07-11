import { DataTable } from '@/components/DataTable';
import CreateApplication from '@/components/dialogs/CreateApplication';
import Logs from '@/components/dialogs/Logs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuSection, MenuSubSection } from '@/components/ui/menu';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
    useOrganizationDatabaseResourceTables,
    useOrganizationDatabaseResources,
    useOrganizationStorageResources,
} from '@/data/organization';
import { useStorageObjects } from '@/data/storage';
import { useApiQuery } from '@/hooks/use-api';
import { useOrganizationActions } from '@/hooks/use-organization';
import { useUserProfile } from '@/hooks/use-user';
import { apiApplicationMemberSchema, parseApiCollection } from '@/lib/api-schemas';
import { apiQueryKey, fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
    APPLICATION_ROLE_NAMES,
    canManageApplication,
    canViewApplicationLogs,
    type ApplicationRole,
} from '@/lib/roles';
import type {
    ApiApplicationMember,
    ApiInvitation,
    ApiOrganizationApplication,
    ApiOrganizationDatabaseResource,
    ApiOrganizationDatabaseTable,
    ApiOrganizationDetails,
    ApiOrganizationMemberSummary,
    ApiOrganizationStorageResource,
    ApiStorageObject,
} from '@/lib/types';
import { formatBytes, formatNumber, getInitials } from '@/lib/utils';
import { PostgreSQL } from '@/svg/PostgreSQL';
import { S3 } from '@/svg/S3';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Boxes, Building2, Database, HardDrive, MoreVertical, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { DatabaseTableRows } from './DatabaseTableRows';
import People from './People';

type SettingsProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    applications: ApiOrganizationApplication[];
    people: ApiOrganizationMemberSummary[];
    invitations: ApiInvitation[];
    isLoading: boolean;
    error: Error | null;
};

type PeopleSection = 'members' | 'invitations';
type SettingsSection = 'organization' | 'applications' | 'database' | 'storage' | PeopleSection;

/** Renders the organization settings page body. */
export default function Settings({
    organization,
    organizationDetails,
    applications,
    people,
    invitations,
    isLoading,
    error,
}: SettingsProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { pathname } = location;
    const {
        settingsApplication = '',
        settingsBucket = '',
        settingsDatabaseResource = '',
        settingsDatabaseResourceType = '',
        settingsDatabaseTable = '',
    } = useParams();
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
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [logsTarget, setLogsTarget] = useState<ApiOrganizationApplication | null>(null);
    const [applicationRoleError, setApplicationRoleError] = useState<string | null>(null);
    const {
        items: storageResources,
        error: storageResourcesError,
        isLoading: storageResourcesIsLoading,
    } = useOrganizationStorageResources(organizationDetails?.id ?? '');

    const organizationMembership = userOrganizations.find((item) => item.slug === organization);
    const organizationRole = organizationMembership?.role ?? null;
    const routeSettingsSection = pathname.split('/')[4] ?? '';
    const hashValue = location.hash.replace(/^#/, '');
    const isPeopleSection = routeSettingsSection === 'people';
    const settingsPeopleSection: PeopleSection = hashValue === 'invitations' ? 'invitations' : 'members';
    const settingsSection: SettingsSection =
        routeSettingsSection === 'applications'
            ? 'applications'
            : routeSettingsSection === 'database'
              ? 'database'
              : routeSettingsSection === 'storage'
                ? 'storage'
                : isPeopleSection
                  ? settingsPeopleSection
                  : 'organization';

    const deleteTarget = applications.find((application) => application.id === deleteTargetId) ?? null;
    const selectedApplication = applications.find((application) => application.slug === settingsApplication) ?? null;
    const selectedDatabaseKind = settingsDatabaseResourceType === 'schemas' ? 'schema' : null;
    const isDatabaseDetailPage = settingsDatabaseResourceType.length > 0 || settingsDatabaseResource.length > 0;
    const isDatabaseTablePage = settingsDatabaseTable.length > 0;
    const selectedDatabaseResource =
        databaseResources.find(
            (resource) =>
                selectedDatabaseKind !== null &&
                resource.kind === selectedDatabaseKind &&
                resource.name === settingsDatabaseResource
        ) ?? null;
    const databaseDetailError =
        databaseResourcesError ??
        (!isLoading && databaseResourcesIsLoading === false && isDatabaseDetailPage && selectedDatabaseResource === null
            ? new Error(t('resources.databaseResourceNotFound', { name: settingsDatabaseResource }))
            : null);
    const databaseTablesRequest = selectedDatabaseResource && isDatabaseDetailPage ? selectedDatabaseResource : null;
    const {
        items: databaseResourceTables,
        error: databaseResourceTablesError,
        isLoading: databaseResourceTablesIsLoading,
    } = useOrganizationDatabaseResourceTables(organizationDetails?.id ?? '', databaseTablesRequest);
    const selectedDatabaseTableName = settingsDatabaseTable;
    const selectedDatabaseTable =
        databaseResourceTables.find((table) => table.name === selectedDatabaseTableName) ?? null;
    const databaseTableDetailError =
        databaseDetailError ??
        (!databaseResourceTablesIsLoading && isDatabaseTablePage && selectedDatabaseTable === null
            ? new Error(t('resources.databaseTableNotFound', { name: selectedDatabaseTableName }))
            : null);
    const isStorageDetailPage = settingsBucket.length > 0;
    const selectedStorageResource =
        storageResources.find((resource) => resource.bucket_name === settingsBucket) ?? null;
    const storageDetailError =
        storageResourcesError ??
        (!isLoading && storageResourcesIsLoading === false && isStorageDetailPage && selectedStorageResource === null
            ? new Error(t('resources.storageBucketNotFound', { name: settingsBucket }))
            : null);
    const {
        items: storageObjects,
        error: storageObjectsError,
        isLoading: storageObjectsIsLoading,
    } = useStorageObjects(
        selectedStorageResource?.storage_registry_id ?? '',
        selectedStorageResource?.bucket_name ?? ''
    );
    const applicationMembersPath = selectedApplication ? `/api/applications/${selectedApplication.id}/members` : null;
    const organizationDetailsPath = organizationDetails ? `/api/organizations/${organizationDetails.id}` : null;
    const applicationMembersQuery = useApiQuery<ApiApplicationMember[]>(applicationMembersPath, {
        parse: (value) => parseApiCollection(apiApplicationMemberSchema, value),
        retry: false,
    });
    const canManageSelectedApplication = selectedApplication
        ? canManageApplication(organizationRole, selectedApplication.role)
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

    /** Navigates settings menu selections through real organization settings routes. */
    function handleSettingsSectionChange(nextSection: string): void {
        setApplicationRoleError(null);

        // Route the settings overview to its base path.
        if (nextSection === 'organization') {
            navigate(`/orgs/${organization}/settings`);
            return;
        }

        // Route top-level resource sections directly.
        if (nextSection === 'applications' || nextSection === 'database' || nextSection === 'storage') {
            navigate(`/orgs/${organization}/settings/${nextSection}`);
            return;
        }

        // Route people subsections through their hash anchors.
        if (nextSection === 'people' || nextSection === 'members' || nextSection === 'invitations') {
            const section = nextSection === 'people' || nextSection === 'members' ? 'members' : 'invitations';

            navigate(`/orgs/${organization}/settings/people#${section}`);
        }
    }

    const appColumns: Array<ColumnDef<ApiOrganizationApplication>> = [
        {
            accessorKey: 'name',
            header: t('columns.application'),
            cell: ({ row, getValue }) => {
                const application = row.original;

                return (
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <Icon name={application.icon ?? 'box'} className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/settings/applications/${application.slug}`}
                                className="text-left font-medium text-foreground hover:underline"
                                onClick={() => setApplicationRoleError(null)}
                            >
                                {getValue<string>()}
                            </Link>
                            {application.description ? (
                                <p className="text-sm text-muted-foreground">{application.description}</p>
                            ) : null}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'role',
            header: t('columns.appRole'),
            cell: ({ row }) =>
                row.original.role ?? (
                    <span className="text-muted-foreground">{t('organizationSettings.notAssigned')}</span>
                ),
            meta: { className: 'w-32' },
        },
        {
            id: 'action',
            header: t('columns.action'),
            meta: { className: 'w-44 text-right' },
            cell: ({ row }) => {
                const application = row.original;
                const canReadLogs =
                    platformRole === 'administrator' || canViewApplicationLogs(organizationRole, application.role);
                const canDelete = canManageApplication(organizationRole, application.role);

                // Hide the action menu when no actions are available.
                if (!canReadLogs && !canDelete) {
                    return <span className="text-muted-foreground">—</span>;
                }

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="cursor-pointer"
                                        aria-label={t('common.openActionsFor', { name: application.name })}
                                    />
                                }
                            >
                                <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                {canReadLogs ? (
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setLogsTarget(application);
                                        }}
                                    >
                                        {t('organizationSettings.logs')}
                                    </DropdownMenuItem>
                                ) : null}
                                {canDelete ? (
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        variant="destructive"
                                        onClick={() => {
                                            // Select the application and open the delete confirmation dialog.
                                            setDeleteTargetId(application.id);
                                            setDeleteError(null);
                                        }}
                                    >
                                        {t('actions.delete')}
                                    </DropdownMenuItem>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    const applicationMemberColumns: Array<ColumnDef<ApiApplicationMember>> = [
        {
            id: 'member',
            header: t('columns.user'),
            cell: ({ row }) => {
                const member = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={member.avatar} alt={`${member.name} avatar`} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-0.5">
                            <div className="truncate text-sm font-medium text-foreground">{member.name}</div>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-56' },
        },
        {
            accessorKey: 'organization_role',
            header: t('organizationSettings.organizationPermission'),
            cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
            meta: { className: 'w-52' },
        },
        {
            id: 'application_role',
            header: t('organizationSettings.applicationPermission'),
            cell: ({ row }) => {
                const member = row.original;
                const value = member.application_role ?? 'none';

                return (
                    <Select
                        value={value}
                        onValueChange={async (nextValue) => {
                            // Ignore changes without an active application.
                            if (selectedApplication === null) {
                                return;
                            }

                            const nextRole =
                                nextValue === 'none' || nextValue === null ? null : (nextValue as ApplicationRole);

                            // Skip updates when the role is unchanged.
                            if (nextRole === member.application_role) {
                                return;
                            }

                            setApplicationRoleError(null);

                            // Persist the selected application role.
                            try {
                                await changeApplicationMemberRole.mutateAsync({
                                    applicationId: selectedApplication.id,
                                    memberId: member.id,
                                    role: nextRole,
                                });
                            } catch (mutationError) {
                                setApplicationRoleError(
                                    mutationError instanceof Error
                                        ? mutationError.message
                                        : t('organizationSettings.failedChangeApplicationPermission')
                                );
                            }
                        }}
                    >
                        <SelectTrigger
                            className="w-44"
                            disabled={!canManageSelectedApplication || changeApplicationMemberRole.isPending}
                        >
                            {value === 'none' ? t('organizationSettings.noAppAccess') : value}
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('organizationSettings.noAppAccess')}</SelectItem>
                            {APPLICATION_ROLE_NAMES.map((role) => (
                                <SelectItem key={role} value={role}>
                                    {role}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            },
            meta: { className: 'w-52' },
        },
    ];

    const databaseResourceColumns: Array<ColumnDef<ApiOrganizationDatabaseResource>> = [
        {
            id: 'resource',
            header: t('columns.resource'),
            cell: ({ row }) => {
                const { space_used, table_count } = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <PostgreSQL
                            aria-hidden={true}
                            className="size-10 shrink-0 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/settings/database/schemas/${encodeURIComponent(row.original.name)}`}
                                className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {row.original.name}
                            </Link>
                            <div className="truncate text-xs text-muted-foreground">
                                {space_used === null ? t('common.unknown') : formatBytes(space_used)} ·{' '}
                                {table_count === null
                                    ? t('resources.unknownTables')
                                    : t('resources.tableCount', { count: formatNumber(table_count) })}
                            </div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            id: 'application',
            header: t('columns.owner'),
            cell: ({ row }) => {
                const application = row.original.application;

                // Show organization ownership for the shared schema.
                if (row.original.name === 'shared') {
                    return (
                        <div className="flex items-start gap-3">
                            <Avatar shape="squircle" className="size-9 shrink-0">
                                <AvatarImage src={organizationAvatar} alt={organizationName} />
                                <AvatarFallback>{getInitials(organizationName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 space-y-1">
                                <div className="font-medium text-foreground">{organizationName}</div>
                                <div className="text-xs text-muted-foreground">{t('columns.organization')}</div>
                            </div>
                        </div>
                    );
                }

                // Mark orphaned resources without an active application.
                if (application === null) {
                    return <span className="text-muted-foreground">{t('organizationSettings.noActiveApp')}</span>;
                }

                return (
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <Icon name={application.icon ?? 'box'} className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/apps/${application.slug}`}
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {application.name}
                            </Link>
                            {application.description ? (
                                <p className="text-sm text-muted-foreground">{application.description}</p>
                            ) : null}
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
    ];

    const storageResourceColumns: Array<ColumnDef<ApiOrganizationStorageResource>> = [
        {
            id: 'resource',
            header: t('columns.resource'),
            cell: ({ row }) => {
                const { object_count, space_used } = row.original;
                const usageSummary = `${space_used === null ? t('common.unknown') : formatBytes(space_used)} · ${
                    object_count === null
                        ? t('resources.unknownObjects')
                        : t('resources.objectCount', { count: formatNumber(object_count) })
                }`;

                return (
                    <div className="flex items-center gap-3">
                        <S3
                            aria-hidden={true}
                            className="size-10 shrink-0 rounded-md border border-border bg-background object-contain p-1"
                        />
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/settings/storage/${encodeURIComponent(row.original.bucket_name)}`}
                                className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {row.original.kind === 'shared_bucket' ? t('resources.shared') : row.original.name}
                            </Link>
                            <div className="truncate text-xs text-muted-foreground">{usageSummary}</div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            id: 'application',
            header: t('columns.owner'),
            cell: ({ row }) => {
                const application = row.original.application;

                // Show organization ownership for the shared bucket.
                if (row.original.kind === 'shared_bucket') {
                    return (
                        <div className="flex items-start gap-3">
                            <Avatar shape="squircle" className="size-9 shrink-0">
                                <AvatarImage src={organizationAvatar} alt={organizationName} />
                                <AvatarFallback>{getInitials(organizationName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 space-y-1">
                                <div className="font-medium text-foreground">{organizationName}</div>
                                <div className="text-xs text-muted-foreground">{t('columns.organization')}</div>
                            </div>
                        </div>
                    );
                }

                // Mark orphaned resources without an active application.
                if (application === null) {
                    return <span className="text-muted-foreground">{t('organizationSettings.noActiveApp')}</span>;
                }

                return (
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <Icon name={application.icon ?? 'box'} className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/apps/${application.slug}`}
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {application.name}
                            </Link>
                            {application.description ? (
                                <p className="text-sm text-muted-foreground">{application.description}</p>
                            ) : null}
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
    ];

    const databaseTableColumns: Array<ColumnDef<ApiOrganizationDatabaseTable>> = [
        {
            accessorKey: 'name',
            header: t('columns.table'),
            cell: ({ row, getValue }) => (
                <Link
                    to={`/orgs/${organization}/settings/database/${settingsDatabaseResourceType}/${encodeURIComponent(settingsDatabaseResource)}/tables/${encodeURIComponent(row.original.name)}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                    {getValue<string>()}
                </Link>
            ),
            meta: { className: 'min-w-52' },
        },
        {
            accessorKey: 'schema_name',
            header: t('columns.schema'),
            meta: { className: 'min-w-44' },
        },
        {
            id: 'columns',
            header: t('columns.columns'),
            cell: ({ row }) => formatNumber(row.original.columns.length),
            meta: { className: 'w-32' },
        },
        {
            id: 'rows',
            header: t('columns.previewRows'),
            cell: ({ row }) => formatNumber(row.original.rows.length),
            meta: { className: 'w-36' },
        },
    ];

    const storageObjectColumns: Array<ColumnDef<ApiStorageObject>> = [
        {
            accessorKey: 'key',
            header: t('columns.object'),
            cell: ({ getValue }) => <div className="truncate font-medium text-foreground">{getValue<string>()}</div>,
            meta: { className: 'min-w-64' },
        },
        {
            accessorKey: 'size',
            header: t('columns.size'),
            cell: ({ getValue }) => formatBytes(getValue<number>()),
            meta: { className: 'w-32' },
        },
    ];

    return (
        <>
            <Menu value={settingsSection} onValueChange={handleSettingsSectionChange} className="items-start">
                <MenuSection value="organization" label={t('columns.organization')} icon={Building2}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">{t('columns.organization')}</h2>
                            <p className="text-sm text-muted-foreground">
                                {t('organizationSettings.organizationDescription')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Avatar shape="squircle" className="size-8 shrink-0">
                                <AvatarImage src={organizationAvatar} alt={organizationName} />
                                <AvatarFallback>{getInitials(organizationName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{organizationName}</div>
                                <div className="truncate text-sm text-muted-foreground">
                                    {organizationDetails?.country} · {organizationDetails?.location.name}
                                </div>
                            </div>
                        </div>
                    </div>
                </MenuSection>

                <MenuSection value="people" label={t('navigation.people')} icon={Users}>
                    <MenuSubSection value="members" label={t('people.membersTitle')}>
                        <People
                            organization={organization}
                            people={people}
                            invitations={invitations}
                            activeSection="members"
                            isLoading={isLoading}
                            error={error}
                        />
                    </MenuSubSection>
                    <MenuSubSection value="invitations" label={t('people.invitationsTitle')}>
                        <People
                            organization={organization}
                            people={people}
                            invitations={invitations}
                            activeSection="invitations"
                            isLoading={isLoading}
                            error={error}
                        />
                    </MenuSubSection>
                </MenuSection>

                <MenuSection value="applications" label={t('navigation.applications')} icon={Boxes}>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                {selectedApplication ? (
                                    <Link
                                        to={`/orgs/${organization}/settings/applications`}
                                        className="inline-flex text-sm font-medium text-foreground hover:underline"
                                        onClick={() => setApplicationRoleError(null)}
                                    >
                                        {t('organizationSettings.back')}
                                    </Link>
                                ) : null}
                                <h2 className="text-lg font-medium text-foreground">
                                    {selectedApplication
                                        ? t('organizationSettings.applicationPermissionsTitle', {
                                              name: selectedApplication.name,
                                          })
                                        : t('navigation.applications')}
                                </h2>
                                {!selectedApplication ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('organizationSettings.reviewApplications')}
                                    </p>
                                ) : !canManageSelectedApplication ? (
                                    <p className="text-sm text-muted-foreground">
                                        {t('organizationSettings.cannotChangePermissions')}
                                    </p>
                                ) : null}
                            </div>

                            {!selectedApplication ? <CreateApplication organization={organization} /> : null}
                        </div>

                        {selectedApplication ? (
                            <>
                                {applicationRoleError ? (
                                    <p className="text-sm text-destructive">{applicationRoleError}</p>
                                ) : null}

                                <DataTable
                                    columns={applicationMemberColumns}
                                    data={applicationMembersQuery.data ?? []}
                                    emptyMessage={t('resources.noOrganizationMembers')}
                                    error={applicationMembersQuery.error}
                                    isLoading={applicationMembersQuery.isLoading}
                                />
                            </>
                        ) : isLoading ? null : error ? (
                            <div className="rounded-md border p-4 text-sm text-destructive">
                                {t('organizationSettings.loadApplicationsFailed')}
                            </div>
                        ) : applications.length ? (
                            <DataTable columns={appColumns} data={applications} />
                        ) : (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                {t('organizationSettings.noApplications')}
                            </div>
                        )}
                    </div>
                </MenuSection>

                <MenuSection value="database" label={t('navigation.database')} icon={Database}>
                    <div className="space-y-4">
                        {isDatabaseDetailPage ? (
                            <>
                                <div className="space-y-1">
                                    <Link
                                        to={
                                            isDatabaseTablePage && selectedDatabaseKind === 'schema'
                                                ? `/orgs/${organization}/settings/database/${settingsDatabaseResourceType}/${encodeURIComponent(settingsDatabaseResource)}`
                                                : `/orgs/${organization}/settings/database`
                                        }
                                        className="inline-flex text-sm font-medium text-foreground hover:underline"
                                    >
                                        {isDatabaseTablePage && selectedDatabaseKind === 'schema'
                                            ? t('resources.backToSchema')
                                            : t('resources.backToDatabase')}
                                    </Link>
                                </div>

                                {isLoading || databaseResourcesIsLoading ? null : databaseDetailError ? (
                                    <div className="rounded-md border p-4 text-sm text-destructive">
                                        {databaseDetailError.message}
                                    </div>
                                ) : databaseResourceTablesIsLoading ? null : databaseResourceTablesError ? (
                                    <div className="rounded-md border p-4 text-sm text-destructive">
                                        {databaseResourceTablesError.message}
                                    </div>
                                ) : isDatabaseTablePage ? (
                                    databaseTableDetailError ? (
                                        <div className="rounded-md border p-4 text-sm text-destructive">
                                            {databaseTableDetailError.message}
                                        </div>
                                    ) : selectedDatabaseTable ? (
                                        <DatabaseTableRows table={selectedDatabaseTable} />
                                    ) : null
                                ) : databaseResourceTables.length ? (
                                    <DataTable columns={databaseTableColumns} data={databaseResourceTables} />
                                ) : (
                                    <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                        {t('resources.noTablesInResource')}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-medium text-foreground">{t('navigation.database')}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t('organizationSettings.reviewDatabase')}
                                    </p>
                                </div>
                                <DataTable
                                    columns={databaseResourceColumns}
                                    data={databaseResources}
                                    error={databaseResourcesError}
                                    isLoading={isLoading || databaseResourcesIsLoading}
                                />
                            </>
                        )}
                    </div>
                </MenuSection>

                <MenuSection value="storage" label={t('navigation.storage')} icon={HardDrive}>
                    <div className="space-y-4">
                        {isStorageDetailPage ? (
                            <>
                                <div className="space-y-1">
                                    <Link
                                        to={`/orgs/${organization}/settings/storage`}
                                        className="inline-flex text-sm font-medium text-foreground hover:underline"
                                    >
                                        {t('resources.backToStorage')}
                                    </Link>
                                </div>

                                {isLoading || storageResourcesIsLoading ? null : storageDetailError ? (
                                    <div className="rounded-md border p-4 text-sm text-destructive">
                                        {storageDetailError.message}
                                    </div>
                                ) : (
                                    <DataTable
                                        columns={storageObjectColumns}
                                        data={storageObjects}
                                        emptyMessage={t('resources.noObjects')}
                                        error={storageObjectsError}
                                        isLoading={storageObjectsIsLoading}
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <h2 className="text-lg font-medium text-foreground">{t('navigation.storage')}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t('organizationSettings.reviewStorage')}
                                    </p>
                                </div>
                                <DataTable
                                    columns={storageResourceColumns}
                                    data={storageResources}
                                    emptyMessage={t('resources.noStorageResources')}
                                    error={storageResourcesError}
                                    isLoading={isLoading || storageResourcesIsLoading}
                                />
                            </>
                        )}
                    </div>
                </MenuSection>
            </Menu>

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
                    trigger={null}
                />
            ) : null}

            <Dialog
                open={deleteTargetId !== null}
                onOpenChange={(open) => {
                    // Reset delete dialog state when closing.
                    if (!open) {
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    }
                }}
            >
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>{t('organizationSettings.deleteApplicationTitle')}</DialogTitle>
                            <DialogDescription>
                                {deleteTarget
                                    ? t('organizationSettings.deleteApplicationDescription', {
                                          name: deleteTarget.name,
                                      })
                                    : t('organizationSettings.deleteApplicationFallback')}
                            </DialogDescription>
                        </div>

                        {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setDeleteTargetId(null);
                                    setDeleteError(null);
                                }}
                            >
                                {t('actions.cancel')}
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isDeletingApplication || deleteTargetId === null}
                                onClick={async () => {
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
                                            setApplicationRoleError(null);
                                            navigate(`/orgs/${organization}/settings/applications`);
                                        }
                                        setDeleteTargetId(null);
                                        setDeleteError(null);
                                    } catch (mutationError) {
                                        setDeleteError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : t('organizationSettings.failedDeleteApplication')
                                        );
                                    }
                                }}
                            >
                                {isDeletingApplication ? t('actions.deleting') : t('actions.delete')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
