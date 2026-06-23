import { DataTable } from '@/components/DataTable';
import CreateAppDialog from '@/components/dialogs/CreateAppDialog';
import LogsDialog from '@/components/dialogs/LogsDialog';
import { useDeleteApp } from '@/hooks/use-org';
import type { ApiOrganizationApplication, ApiOrganizationDetails } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { Input } from '@ui/input';
import { Menu, MenuSection } from '@ui/menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Boxes, Building2, Crown, Database, GitPullRequest, HardDrive, PenLine, Plug, Settings2, ShieldCheck } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
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
    org: string;
    orgDetails: ApiOrganizationDetails | undefined;
    applications: ApiOrganizationApplication[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization settings page body. */
export default function Settings({ org, orgDetails, applications, isLoading, error }: SettingsProps) {
    const deleteApp = useDeleteApp(org);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteTarget = applications.find((application) => application.id === deleteTargetId) ?? null;

    const appColumns: Array<ColumnDef<ApiOrganizationApplication>> = [
        {
            accessorKey: 'name',
            header: 'Application',
            cell: ({ row, getValue }) => {
                const iconName = (row.original.icon ?? 'box').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

                return (
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <DynamicIcon
                                name={iconName as Parameters<typeof DynamicIcon>[0]['name']}
                                aria-hidden={true}
                                className="size-4"
                            />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${org}/apps/${row.original.slug}`}
                                className="font-medium text-foreground hover:underline"
                            >
                                {getValue<string>()}
                            </Link>
                            {row.original.description ? (
                                <p className="text-sm text-muted-foreground">{row.original.description}</p>
                            ) : null}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'action',
            header: 'Action',
            meta: { className: 'w-44' },
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <LogsDialog org={org} appId={row.original.id} appName={row.original.name} />
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            // Select the application and open the delete confirmation dialog.
                            setDeleteTargetId(row.original.id);
                            setDeleteError(null);
                        }}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Menu defaultValue="organization" className="items-start">
                <MenuSection value="organization" label="Organization" icon={Building2}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Organization</h2>
                            <p className="text-sm text-muted-foreground">View and manage organization details.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">Organization</label>
                                <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                                    <Avatar className="size-8">
                                        <AvatarImage src={orgDetails?.avatar ?? ''} alt={orgDetails?.name ?? org} />
                                        <AvatarFallback>
                                            {(orgDetails?.name ?? org).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-foreground">{orgDetails?.name ?? org}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">Location</label>
                                <Input value={orgDetails?.location?.name ?? '—'} readOnly />
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
                                                        <div className="text-sm text-muted-foreground">{role.description}</div>
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

                            <CreateAppDialog org={org} />
                        </div>
                        {isLoading ? (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                Loading applications...
                            </div>
                        ) : error ? (
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
                                Configure database-backed services and connections.
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="bg-muted/50">Name</TableHead>
                                        <TableHead className="bg-muted/50">Type</TableHead>
                                        <TableHead className="bg-muted/50">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody />
                            </Table>
                        </div>
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
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="bg-muted/50">Name</TableHead>
                                        <TableHead className="bg-muted/50">Type</TableHead>
                                        <TableHead className="bg-muted/50">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody />
                            </Table>
                        </div>
                    </div>
                </MenuSection>

                <MenuSection value="logging" label="Logging" icon={Settings2}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Logging</h2>
                            <p className="text-sm text-muted-foreground">Configure event and audit logging outputs.</p>
                        </div>
                    </div>
                </MenuSection>

                <MenuSection value="integrations" label="Integrations" icon={Plug}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Integrations</h2>
                            <p className="text-sm text-muted-foreground">
                                Connect external services and workflow tools.
                            </p>
                        </div>
                    </div>
                </MenuSection>
            </Menu>

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
                            <DialogTitle>Delete app</DialogTitle>
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
                                disabled={deleteApp.isPending || deleteTargetId === null}
                                onClick={async () => {
                                    if (deleteTargetId === null) {
                                        return;
                                    }

                                    const id = deleteTargetId;

                                    try {
                                        await deleteApp.mutateAsync(id);
                                        setDeleteTargetId(null);
                                        setDeleteError(null);
                                    } catch (mutationError) {
                                        setDeleteError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : 'Failed to delete app'
                                        );
                                    }
                                }}
                            >
                                {deleteApp.isPending ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
