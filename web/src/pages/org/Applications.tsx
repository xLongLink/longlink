import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { DynamicIcon } from 'lucide-react/dynamic';
import { useState } from 'react';
import { Link } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useDeleteApp } from '@/hooks/use-org';
import type { ApiOrganizationApplication } from '@/lib/types';

type ApplicationsProps = {
    org: string;
    applications: ApiOrganizationApplication[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization applications table. */
export default function Applications({ org, applications, isLoading, error }: ApplicationsProps) {
    const deleteApp = useDeleteApp(org);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteTarget = applications.find((application) => application.id === deleteTargetId) ?? null;
    const appColumns: Array<ColumnDef<ApiOrganizationApplication>> = [
        {
            accessorKey: 'name',
            header: 'Application',
            cell: ({ row, getValue }) => {
                const name = getValue<string>();
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
                                {name}
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
            id: 'created_by',
            header: 'Created by',
            cell: ({ row }) => {
                const createdBy = row.original.created_by;

                if (!createdBy) {
                    return '—';
                }

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={createdBy.avatar} alt={createdBy.name} />
                            <AvatarFallback>{createdBy.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{createdBy.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                                {new Date(row.original.created_at).toLocaleString()}
                            </div>
                        </div>
                    </div>
                );
            },
            meta: { className: 'w-64' },
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
                        setDeleteTargetId(row.original.id);
                        setDeleteError(null);
                    }}
                >
                    Delete
                </Button>
            ),
        },
    ] satisfies Array<ColumnDef<ApiOrganizationApplication>>;

    return (
        <>
            <div className="space-y-4">
                {isLoading && applications.length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading applications...</div>
                ) : error && applications.length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">Failed to load applications.</div>
                ) : (
                    <DataTable columns={appColumns} data={applications} />
                )}
            </div>

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
