import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';

import { DataTable } from '@/components/DataTable';
import { useOperations } from '@/hooks/use-operations';
import type { ApiOperation } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

const OPERATION_STATUS_LABELS: Record<ApiOperation['status'], string> = {
    scheduled: 'Scheduled',
    active: 'Active',
    completed: 'Completed',
    failed: 'Failed',
};

const operationColumns: Array<ColumnDef<ApiOperation>> = [
    {
        accessorKey: 'kind',
        header: 'Operation',
        cell: ({ row }) => {
            const operation = row.original;

            return (
                <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{operation.kind}</div>
                    <div className="text-xs text-muted-foreground">{OPERATION_STATUS_LABELS[operation.status]}</div>
                </div>
            );
        },
        meta: { className: 'min-w-56' },
    },
    {
        id: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => {
            const operation = row.original;

            return (
                <div className="flex flex-col gap-1 leading-tight">
                    <div>
                        <span className="text-xs text-muted-foreground">Created</span>{' '}
                        {formatDateTime(operation.created_at)}
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground">Started</span>{' '}
                        {operation.started_at ? formatDateTime(operation.started_at) : '—'}
                    </div>
                </div>
            );
        },
        meta: { className: 'w-72' },
    },
    {
        accessorKey: 'stopped_at',
        header: 'Stopped',
        cell: ({ getValue }) => {
            const value = getValue<string | null>();

            return value ? formatDateTime(value) : '—';
        },
        meta: { className: 'w-52' },
    },
    {
        id: 'metadata',
        header: 'Metadata',
        cell: ({ row }) => {
            const operation = row.original;

            return (
                <div className="min-w-0 space-y-1 text-sm">
                    <div className="truncate">
                        <span className="text-xs text-muted-foreground">ID</span>{' '}
                        <span className="font-mono text-xs">{operation.id}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground">Step</span> {operation.step}
                    </div>
                    <div className="truncate">
                        <span className="text-xs text-muted-foreground">Application</span>{' '}
                        {operation.application_id ? (
                            <span className="font-mono text-xs">{operation.application_id}</span>
                        ) : (
                            '—'
                        )}
                    </div>
                    {operation.error ? (
                        <div className="truncate text-destructive">
                            <span className="text-xs">Error</span> {operation.error}
                        </div>
                    ) : null}
                </div>
            );
        },
        meta: { className: 'min-w-80' },
    },
];

/** Renders the admin operations page. */
export default function AdminOperations() {
    const { items: operationRows, error, isLoading } = useOperations();

    return (
        <div className="space-y-6">
            <Hero icon="activity">
                <div>
                    <HeroTitle>Operations</HeroTitle>
                    <HeroDescription>
                        Track long-running platform tasks, their start time, and when they stopped.
                    </HeroDescription>
                </div>
            </Hero>
            <DataTable columns={operationColumns} data={operationRows} error={error} isLoading={isLoading} />
        </div>
    );
}
