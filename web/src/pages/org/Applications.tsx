import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Button } from '@ui/button';
import { Link } from 'react-router';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import * as LucideIcons from 'lucide-react';

import { DataTable } from '@/components/DataTable';
import { useDeleteApp } from '@/hooks/use-org';
import type { ApiOrgApp } from '@/lib/types';

type ApplicationsProps = {
    org: string;
    apps: ApiOrgApp[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization applications table. */
export default function Applications({ org, apps, isLoading, error }: ApplicationsProps) {
    const deleteApp = useDeleteApp(org);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deleteTarget = apps.find((app) => app.id === deleteTargetId) ?? null;
    const appColumns: Array<ColumnDef<ApiOrgApp>> = [
        {
            id: 'icon',
            header: '',
            meta: { className: 'w-10' },
            cell: ({ row }) => {
                const iconName = row.original.icon ?? 'Box';
                const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
                return IconComponent ? <IconComponent className="size-5" /> : <span className="size-5" />;
            },
        },
        {
            accessorKey: 'name',
            header: 'App',
            cell: ({ row, getValue }) => {
                const name = getValue<string>();

                return (
                    <Link to={`/${org}/${name}`} className="font-medium text-foreground hover:underline">
                        {name}
                    </Link>
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
    ] satisfies Array<ColumnDef<ApiOrgApp>>;

    return (
        <>
            {isLoading && apps.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading apps...</div>
            ) : error && apps.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">Failed to load apps.</div>
            ) : (
                <DataTable columns={appColumns} data={apps} />
            )}

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
