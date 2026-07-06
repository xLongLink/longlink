import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import type { TFunction } from 'i18next';

import { DataTable } from '@/components/DataTable';
import { useOperations } from '@/hooks/use-operations';
import { useTranslation } from '@/lib/i18n';
import type { ApiOperation } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

/** Returns localized admin operation table columns. */
function createOperationColumns(t: TFunction): Array<ColumnDef<ApiOperation>> {
    const operationStatusLabels: Record<ApiOperation['status'], string> = {
        scheduled: t('admin.operationStatus.scheduled'),
        active: t('admin.operationStatus.active'),
        completed: t('admin.operationStatus.completed'),
        failed: t('admin.operationStatus.failed'),
    };

    return [
        {
            accessorKey: 'kind',
            header: t('columns.operation'),
            cell: ({ row }) => {
                const operation = row.original;

                return (
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{operation.kind}</div>
                        <div className="text-xs text-muted-foreground">{operationStatusLabels[operation.status]}</div>
                    </div>
                );
            },
            meta: { className: 'min-w-56' },
        },
        {
            id: 'timestamp',
            header: t('columns.timestamp'),
            cell: ({ row }) => {
                const operation = row.original;

                return (
                    <div className="flex flex-col gap-1 leading-tight">
                        <div>
                            <span className="text-xs text-muted-foreground">{t('columns.created')}</span>{' '}
                            {formatDateTime(operation.created_at)}
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground">{t('columns.started')}</span>{' '}
                            {operation.started_at ? formatDateTime(operation.started_at) : '—'}
                        </div>
                    </div>
                );
            },
            meta: { className: 'w-72' },
        },
        {
            accessorKey: 'stopped_at',
            header: t('columns.stopped'),
            cell: ({ getValue }) => {
                const value = getValue<string | null>();

                return value ? formatDateTime(value) : '—';
            },
            meta: { className: 'w-52' },
        },
        {
            id: 'metadata',
            header: t('columns.metadata'),
            cell: ({ row }) => {
                const operation = row.original;

                return (
                    <div className="min-w-0 space-y-1 text-sm">
                        <div className="truncate">
                            <span className="text-xs text-muted-foreground">{t('columns.id')}</span>{' '}
                            <span className="font-mono text-xs">{operation.id}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground">{t('columns.step')}</span> {operation.step}
                        </div>
                        <div className="truncate">
                            <span className="text-xs text-muted-foreground">{t('columns.application')}</span>{' '}
                            {operation.application_id ? (
                                <span className="font-mono text-xs">{operation.application_id}</span>
                            ) : (
                                '—'
                            )}
                        </div>
                        <div className="truncate">
                            <span className="text-xs text-muted-foreground">{t('columns.organization')}</span>{' '}
                            {operation.organization_id ? (
                                <span className="font-mono text-xs">{operation.organization_id}</span>
                            ) : (
                                '—'
                            )}
                        </div>
                        {operation.error ? (
                            <div className="truncate text-destructive">
                                <span className="text-xs">{t('columns.error')}</span> {operation.error}
                            </div>
                        ) : null}
                    </div>
                );
            },
            meta: { className: 'min-w-80' },
        },
    ];
}

/** Renders the admin operations page. */
export default function AdminOperations() {
    const { t } = useTranslation();
    const { items: operationRows, error, isLoading } = useOperations();
    const operationColumns = createOperationColumns(t);

    return (
        <div className="space-y-6">
            <Hero icon="activity">
                <div>
                    <HeroTitle>{t('admin.operationsTitle')}</HeroTitle>
                    <HeroDescription>{t('admin.operationsDescription')}</HeroDescription>
                </div>
            </Hero>
            <DataTable columns={operationColumns} data={operationRows} error={error} isLoading={isLoading} />
        </div>
    );
}
