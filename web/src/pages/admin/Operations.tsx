import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Activity } from 'lucide-react';

import { DataTable } from '@/components/DataTable';
import { useApiQuery } from '@/hooks/use-api';
import type { ApiOperation } from '@/lib/types';

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
                        {new Date(operation.created_at).toLocaleString()}
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground">Started</span>{' '}
                        {operation.started_at ? new Date(operation.started_at).toLocaleString() : '—'}
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

            return value ? new Date(value).toLocaleString() : '—';
        },
        meta: { className: 'w-52' },
    },
    {
        accessorKey: 'payload',
        header: 'Payload',
        cell: ({ getValue }) => JSON.stringify(getValue<Record<string, unknown>>()),
        meta: { className: 'min-w-72' },
    },
];

/** Renders the admin operations page. */
export default function AdminOperations() {
    const operationsQuery = useApiQuery<Array<ApiOperation>>('/api/operations', {
        retry: false,
        refetchOnMount: 'always',
    });

    const operationRows = operationsQuery.data ?? [];

    return (
        <div className="space-y-6">
            <Hero icon={<Activity />}>
                <div>
                    <HeroTitle>Operations</HeroTitle>
                    <HeroDescription>
                        Track long-running platform tasks, their start time, and when they stopped.
                    </HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={operationColumns}
                data={operationRows}
                error={operationsQuery.error}
                isLoading={operationsQuery.isLoading}
            />
        </div>
    );
}
