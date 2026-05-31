import { DataTable } from '@/components/DataTable';
import CreateAppDialog from '@/components/dialogs/CreateAppDialog';
import { useDeleteApp } from '@/hooks/use-org';
import type { ApiOrgApp, ApiOrgDetails } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { Menu, MenuSection } from '@ui/menu';
import { Boxes, Building2, Cpu, Database, HardDrive, Plug, Settings2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

type SettingsProps = {
    org: string;
    orgDetails: ApiOrgDetails | undefined;
    apps: ApiOrgApp[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization settings page body. */
export default function Settings({ org, orgDetails, apps, isLoading, error }: SettingsProps) {
    const deleteApp = useDeleteApp(org);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const deleteTarget = apps.find((app) => app.id === deleteTargetId) ?? null;
    const appColumns: Array<ColumnDef<ApiOrgApp>> = [
        {
            accessorKey: 'name',
            header: 'App',
            cell: ({ row, getValue }) => (
                <Link to={`/${org}/${row.original.name}`} className="font-medium text-foreground hover:underline">
                    {getValue<string>()}
                </Link>
            ),
        },
        {
            accessorKey: 'url',
            header: 'URL',
            cell: ({ getValue }) => (
                <span className="truncate text-sm text-muted-foreground">{getValue<string>()}</span>
            ),
        },
        {
            id: 'action',
            header: 'Action',
            meta: { className: 'w-32' },
            cell: ({ row }) => (
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                        // Select the app and open the delete confirmation dialog.
                        setDeleteTargetId(row.original.id);
                        setDeleteError(null);
                    }}
                >
                    Delete
                </Button>
            ),
        },
    ];

    return (
        <Menu defaultValue="organization" className="items-start">
            <MenuSection value="organization" label="Organization" icon={Building2}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-sm text-muted-foreground">Name</dt>
                            <dd className="text-lg font-medium text-foreground">{orgDetails?.name ?? org}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Location</dt>
                            <dd className="text-base text-foreground">{orgDetails?.location?.display_name ?? '—'}</dd>
                        </div>
                    </dl>
                </div>
            </MenuSection>

            <MenuSection value="permissions" label="Permissions" icon={ShieldCheck}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-foreground">Permissions</h2>
                        <p className="text-sm text-muted-foreground">Control member roles and access policies.</p>
                    </div>
                </div>
            </MenuSection>

            <MenuSection value="applications" label="Applications" icon={Boxes}>
                <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Applications</h2>
                            <p className="text-sm text-muted-foreground">Review apps connected to this organization.</p>
                        </div>

                        <CreateAppDialog org={org} />
                    </div>

                    {isLoading ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading apps...</div>
                    ) : error ? (
                        <div className="rounded-md border p-4 text-sm text-destructive">Failed to load apps.</div>
                    ) : apps.length ? (
                        <DataTable columns={appColumns} data={apps} />
                    ) : (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">No apps found.</div>
                    )}
                </div>
            </MenuSection>

            <MenuSection value="database" label="Database" icon={Database}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-foreground">Database</h2>
                        <p className="text-sm text-muted-foreground">
                            Configure database-backed services and connections.
                        </p>
                    </div>
                </div>
            </MenuSection>

            <MenuSection value="storage" label="Storage" icon={HardDrive}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-foreground">Storage</h2>
                        <p className="text-sm text-muted-foreground">Manage files, buckets, and persisted assets.</p>
                    </div>
                </div>
            </MenuSection>

            <MenuSection value="compute" label="Compute" icon={Cpu}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-foreground">Compute</h2>
                        <p className="text-sm text-muted-foreground">Adjust runtime and execution capacity settings.</p>
                    </div>
                </div>
            </MenuSection>

            <MenuSection value="logging" label="Logging" icon={Settings2}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-foreground">Logging</h2>
                        <p className="text-sm text-muted-foreground">Configure event and audit logging outputs.</p>
                    </div>
                </div>
            </MenuSection>

            <MenuSection value="integrations" label="Integrations" icon={Plug}>
                <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-foreground">Integrations</h2>
                        <p className="text-sm text-muted-foreground">Connect external services and workflow tools.</p>
                    </div>
                </div>
            </MenuSection>

            <Dialog
                open={deleteTarget !== null}
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
                                    ? `Delete ${deleteTarget} from this organization?`
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
                                disabled={deleteApp.isPending || deleteTarget === null}
                                onClick={async () => {
                                    if (!deleteTarget) {
                                        return;
                                    }

                                    // Delete the selected app and close the dialog on success.
                                    try {
                                        await deleteApp.mutateAsync(deleteTarget.id);
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
        </Menu>
    );
}
