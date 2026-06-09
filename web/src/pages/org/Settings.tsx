import { DataTable } from '@/components/DataTable';
import CreateAppDialog from '@/components/dialogs/CreateAppDialog';
import LogsDialog from '@/components/dialogs/LogsDialog';
import { useDeleteApp } from '@/hooks/use-org';
import type { ApiOrgApp, ApiOrgDetails } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { Input } from '@ui/input';
import { Menu, MenuSection } from '@ui/menu';
import { DynamicIcon } from 'lucide-react/dynamic';
import { Boxes, Building2, Database, HardDrive, Plug, Settings2, ShieldCheck } from 'lucide-react';
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
                                to={`/orgs/${org}/apps/${row.original.name}`}
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
                            // Select the app and open the delete confirmation dialog.
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
                        <hr className="border-border" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">Name</label>
                                <Input value={orgDetails?.name ?? org} readOnly />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm text-muted-foreground">Location</label>
                                <Input value={orgDetails?.location?.display_name ?? '—'} readOnly />
                            </div>
                        </div>
                    </div>
                </MenuSection>

                <MenuSection value="permissions" label="Permissions" icon={ShieldCheck}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Permissions</h2>
                            <p className="text-sm text-muted-foreground">Control member roles and access policies.</p>
                        </div>
                        <hr className="border-border" />
                    </div>
                </MenuSection>

                <MenuSection value="applications" label="Applications" icon={Boxes}>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-lg font-medium text-foreground">Applications</h2>
                                <p className="text-sm text-muted-foreground">
                                    Review apps connected to this organization.
                                </p>
                            </div>

                            <CreateAppDialog org={org} />
                        </div>
                        <hr className="border-border" />
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
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Database</h2>
                            <p className="text-sm text-muted-foreground">
                                Configure database-backed services and connections.
                            </p>
                        </div>
                        <hr className="border-border" />
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
                        <hr className="border-border" />
                    </div>
                </MenuSection>

                <MenuSection value="logging" label="Logging" icon={Settings2}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Logging</h2>
                            <p className="text-sm text-muted-foreground">Configure event and audit logging outputs.</p>
                        </div>
                        <hr className="border-border" />
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
                        <hr className="border-border" />
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
