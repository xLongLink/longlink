import { DataTable } from '@/components/DataTable';
import CreateApplicationDialog from '@/components/dialogs/CreateApplicationDialog';
import LogsDialog from '@/components/dialogs/LogsDialog';
import { Icon } from '@/components/ui/icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrganizationActions } from '@/hooks/use-organization';
import { useOrganizationDatabaseResources } from '@/hooks/use-organization-database-resources';
import { useOrganizationStorageResources } from '@/hooks/use-organization-storage-resources';
import { useUser } from '@/hooks/use-user';
import { canAccessApplication, canManageApplication, canViewApplicationLogs } from '@/lib/roles';
import type {
    ApiOrganizationApplication,
    ApiOrganizationDatabaseResource,
    ApiOrganizationDetails,
    ApiOrganizationStorageResource,
} from '@/lib/types';
import { formatBytes, formatNumber, getInitials } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Badge } from '@ui/badge';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Menu, MenuSection } from '@ui/menu';
import {
    BookOpen,
    Boxes,
    Building2,
    Crown,
    Database,
    GitPullRequest,
    HardDrive,
    MoreVertical,
    PenLine,
    Settings2,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

const permissionRoles = [
    {
        name: 'read',
        description: 'View organization data and access assigned resources.',
        icon: BookOpen,
    },
    {
        name: 'write',
        description: 'Read access plus create and update organization resources.',
        icon: GitPullRequest,
    },
    {
        name: 'maintain',
        description: 'Write access plus manage settings for supported resources.',
        icon: PenLine,
    },
    {
        name: 'admin',
        description: 'Full access to the organization and its resources.',
        icon: Settings2,
    },
    {
        name: 'owner',
        description: 'Highest access. Can manage ownership and all organization settings.',
        icon: Crown,
    },
] as const;

type SettingsProps = {
    organization: string;
    organizationDetails: ApiOrganizationDetails | undefined;
    applications: ApiOrganizationApplication[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization settings page body. */
export default function Settings({ organization, organizationDetails, applications, isLoading, error }: SettingsProps) {
    const { role: platformRole, organizations: userOrganizations } = useUser();
    const { deleteApplication, isDeletingApplication } = useOrganizationActions(organization);
    const {
        items: databaseResources,
        error: databaseResourcesError,
        isLoading: databaseResourcesIsLoading,
    } = useOrganizationDatabaseResources(organizationDetails?.id ?? '');
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [logsTarget, setLogsTarget] = useState<ApiOrganizationApplication | null>(null);
    const {
        items: storageResources,
        error: storageResourcesError,
        isLoading: storageResourcesIsLoading,
    } = useOrganizationStorageResources(organizationDetails?.id ?? '');

    const organizationMembership = userOrganizations.find((item) => item.slug === organization);
    const organizationRole = organizationMembership?.role ?? null;

    const deleteTarget = applications.find((application) => application.id === deleteTargetId) ?? null;

    const appColumns: Array<ColumnDef<ApiOrganizationApplication>> = [
        {
            accessorKey: 'name',
            header: 'Application',
            cell: ({ row, getValue }) => {
                const application = row.original;
                const canOpen = canAccessApplication(organizationRole, application.role);

                return (
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <Icon name={application.icon ?? 'box'} className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            {canOpen ? (
                                <Link
                                    to={`/orgs/${organization}/apps/${application.slug}`}
                                    className="font-medium text-foreground hover:underline"
                                >
                                    {getValue<string>()}
                                </Link>
                            ) : (
                                <span className="font-medium text-foreground">{getValue<string>()}</span>
                            )}
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
            header: 'App role',
            cell: ({ row }) => row.original.role ?? <span className="text-muted-foreground">Not assigned</span>,
            meta: { className: 'w-32' },
        },
        {
            id: 'action',
            header: 'Action',
            meta: { className: 'w-44 text-right' },
            cell: ({ row }) => {
                const application = row.original;
                const canReadLogs =
                    platformRole === 'administrator' || canViewApplicationLogs(organizationRole, application.role);
                const canDelete = canManageApplication(organizationRole, application.role);

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
                                        aria-label={`Open actions for ${application.name}`}
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
                                        Logs
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
                                        Delete
                                    </DropdownMenuItem>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    const databaseResourceColumns: Array<ColumnDef<ApiOrganizationDatabaseResource>> = [
        {
            id: 'resource',
            header: 'Resource',
            cell: ({ row }) => {
                const isBrowsable = row.original.status === 'available' || row.original.status === 'orphaned';

                return (
                    <div className="min-w-0 space-y-1">
                        {isBrowsable ? (
                            <Link
                                to={`/orgs/${organization}/database/${row.original.kind === 'shared_table' ? 'tables' : 'schemas'}/${encodeURIComponent(row.original.name)}`}
                                className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                            >
                                {row.original.name}
                            </Link>
                        ) : (
                            <span className="block truncate font-medium text-muted-foreground">
                                {row.original.name}
                            </span>
                        )}
                        <div className="truncate text-xs text-muted-foreground">{row.original.database_name}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-44' },
        },
        {
            id: 'application',
            header: 'Application',
            cell: ({ row }) => {
                const application = row.original.application;
                if (row.original.kind === 'shared_table') {
                    return (
                        <div className="min-w-0 space-y-1">
                            <div className="font-medium text-foreground">All applications</div>
                            <div className="text-xs text-muted-foreground">Shared organization users</div>
                        </div>
                    );
                }

                if (application === null) {
                    return <span className="text-muted-foreground">No active app</span>;
                }

                return (
                    <div className="min-w-0 space-y-1">
                        <Link
                            to={`/orgs/${organization}/apps/${application.slug}`}
                            className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                            {application.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{application.status}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ getValue }) => {
                const status = getValue<ApiOrganizationDatabaseResource['status']>();
                const variant = status === 'available' ? 'default' : status === 'orphaned' ? 'outline' : 'destructive';

                return <Badge variant={variant}>{status}</Badge>;
            },
            meta: { className: 'w-32' },
        },
        {
            id: 'usage',
            header: 'Usage',
            cell: ({ row }) => {
                const { row_estimate, space_used, table_count } = row.original;

                return (
                    <div className="min-w-0 space-y-1">
                        <div className="font-medium text-foreground">
                            {space_used === null ? 'Unknown' : formatBytes(space_used)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {table_count === null ? 'Unknown tables' : `${formatNumber(table_count)} tables`} ·{' '}
                            {row_estimate === null ? 'unknown rows' : `${formatNumber(row_estimate)} rows`}
                        </div>
                    </div>
                );
            },
            meta: { className: 'min-w-44' },
        },
    ];

    const storageResourceColumns: Array<ColumnDef<ApiOrganizationStorageResource>> = [
        {
            id: 'resource',
            header: 'Name',
            cell: ({ row }) => {
                const application = row.original.application;

                if (row.original.kind === 'shared_bucket') {
                    return (
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/storage/buckets/${encodeURIComponent(row.original.bucket_name)}`}
                                className="block truncate font-medium text-primary underline-offset-4 hover:underline"
                            >
                                shared
                            </Link>
                            <div className="truncate text-xs text-muted-foreground">
                                All applications · {row.original.bucket_name}
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="min-w-0 space-y-1">
                        {application ? (
                            <Link
                                to={`/orgs/${organization}/storage/buckets/${encodeURIComponent(row.original.bucket_name)}`}
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                {application.name}
                            </Link>
                        ) : (
                            <Link
                                to={`/orgs/${organization}/storage/buckets/${encodeURIComponent(row.original.bucket_name)}`}
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                {row.original.name}
                            </Link>
                        )}
                        <div className="truncate text-xs text-muted-foreground">{row.original.bucket_name}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-52' },
        },
        {
            accessorKey: 'kind',
            header: 'Type',
            cell: ({ getValue }) => {
                const kind = getValue<ApiOrganizationStorageResource['kind']>();

                return kind === 'shared_bucket' ? 'Shared bucket' : 'Application bucket';
            },
            meta: { className: 'w-44' },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ getValue }) => {
                const status = getValue<ApiOrganizationStorageResource['status']>();
                const variant = status === 'available' ? 'default' : status === 'orphaned' ? 'outline' : 'destructive';

                return <Badge variant={variant}>{status}</Badge>;
            },
            meta: { className: 'w-32' },
        },
    ];

    return (
        <>
            <Menu defaultValue="organization" hashNavigation className="items-start">
                <MenuSection value="organization" label="Organization" icon={Building2}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Organization</h2>
                            <p className="text-sm text-muted-foreground">View and manage organization details.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Avatar shape="squircle" className="size-8 shrink-0">
                                <AvatarImage
                                    src={organizationDetails?.avatar ?? ''}
                                    alt={organizationDetails?.name ?? organization}
                                />
                                <AvatarFallback>
                                    {getInitials(organizationDetails?.name ?? organization)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">
                                    {organizationDetails?.name ?? organization}
                                </div>
                                <div className="truncate text-sm text-muted-foreground">
                                    {organizationDetails?.location.country} · {organizationDetails?.location.name}
                                </div>
                            </div>
                        </div>
                    </div>
                </MenuSection>

                <MenuSection value="permissions" label="Permissions" icon={ShieldCheck}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Permissions</h2>
                            <p className="text-sm text-muted-foreground">
                                Predefined roles for member access and repository permissions.
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="bg-muted/50">Permission</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {permissionRoles.map((role) => (
                                        <TableRow key={role.name}>
                                            <TableCell>
                                                <div className="flex items-start gap-3">
                                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                                        <role.icon aria-hidden={true} className="size-4" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-foreground">{role.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {role.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </MenuSection>

                <MenuSection value="applications" label="Applications" icon={Boxes}>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-lg font-medium text-foreground">Applications</h2>
                                <p className="text-sm text-muted-foreground">
                                    Review applications connected to this organization.
                                </p>
                            </div>

                            <CreateApplicationDialog organization={organization} />
                        </div>
                        {isLoading ? null : error ? (
                            <div className="rounded-md border p-4 text-sm text-destructive">
                                Failed to load applications.
                            </div>
                        ) : applications.length ? (
                            <DataTable columns={appColumns} data={applications} />
                        ) : (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                No applications found.
                            </div>
                        )}
                    </div>
                </MenuSection>

                <MenuSection value="database" label="Database" icon={Database}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Database</h2>
                            <p className="text-sm text-muted-foreground">
                                Review application schemas and the shared organization users table.
                            </p>
                        </div>
                        <DataTable
                            columns={databaseResourceColumns}
                            data={databaseResources}
                            error={databaseResourcesError}
                            isLoading={isLoading || databaseResourcesIsLoading}
                        />
                    </div>
                </MenuSection>

                <MenuSection value="storage" label="Storage" icon={HardDrive}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Storage</h2>
                            <p className="text-sm text-muted-foreground">
                                Manage files, buckets, and persisted assets.
                            </p>
                        </div>
                        <DataTable
                            columns={storageResourceColumns}
                            data={storageResources}
                            emptyMessage="No storage resources found."
                            error={storageResourcesError}
                            isLoading={isLoading || storageResourcesIsLoading}
                        />
                    </div>
                </MenuSection>
            </Menu>

            {logsTarget ? (
                <LogsDialog
                    applicationId={logsTarget.id}
                    applicationName={logsTarget.name}
                    open={logsTarget !== null}
                    onOpenChange={(open) => {
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
                    if (!open) {
                        setDeleteTargetId(null);
                        setDeleteError(null);
                    }
                }}
            >
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>Delete application</DialogTitle>
                            <DialogDescription>
                                {deleteTarget
                                    ? `Delete ${deleteTarget.name} from this organization?`
                                    : 'Delete this application?'}
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
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isDeletingApplication || deleteTargetId === null}
                                onClick={async () => {
                                    if (deleteTargetId === null) {
                                        return;
                                    }

                                    const id = deleteTargetId;

                                    try {
                                        await deleteApplication(id);
                                        setDeleteTargetId(null);
                                        setDeleteError(null);
                                    } catch (mutationError) {
                                        setDeleteError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : 'Failed to delete application'
                                        );
                                    }
                                }}
                            >
                                {isDeletingApplication ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
