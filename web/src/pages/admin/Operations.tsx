import { useQuery } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Activity } from 'lucide-react';

import { DataTable } from '@/components/DataTable';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiOperation } from '@/lib/types';

const operationColumns: Array<ColumnDef<ApiOperation>> = [
    {
        accessorKey: 'kind',
        header: 'Operation',
        cell: ({ row }) => {
            const operation = row.original;
            const status = operation.stopped_at ? 'Stopped' : operation.started_at ? 'Running' : 'Pending';

            return (
                <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{operation.kind}</div>
                    <div className="text-xs text-muted-foreground">{status}</div>
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
    const operationsUrl = apiUrl('/api/operations');

    const operationsQuery = useQuery({
        queryKey: ['api', operationsUrl],
        queryFn: async () => fetchApiJson<Array<ApiOperation>>(operationsUrl, { credentials: 'include' }),
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
            {operationsQuery.isLoading && operationRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading records...</div>
            ) : operationsQuery.error && operationRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">{operationsQuery.error.message}</div>
            ) : (
                <DataTable columns={operationColumns} data={operationRows} />
            )}
        </div>
    );
}
