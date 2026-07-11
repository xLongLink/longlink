import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { type ColumnDef } from '@tanstack/react-table';
import { Link, useParams } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { useStorageBuckets, useStorages } from '@/data/storage';
import { useTranslation } from '@/lib/i18n';
import type { ApiStorageBucket } from '@/lib/types';
import { S3 } from '@/svg/S3';

/** Renders buckets for a storage backend. */
export default function StorageBuckets() {
    const { t } = useTranslation();
    const { storage = '' } = useParams();

    const { items: registries, error: registriesError, isLoading: registriesIsLoading } = useStorages();

    const storageRegistry = registries.find((registry) => registry.slug === storage);

    const bucketColumns: Array<ColumnDef<ApiStorageBucket>> = [
        {
            accessorKey: 'name',
            header: t('columns.bucket'),
            cell: ({ row }) => (
                <Link
                    to={`/admin/storage/${encodeURIComponent(storage)}/buckets/${encodeURIComponent(row.original.name)}`}
                    className="flex items-center gap-3"
                >
                    <S3
                        aria-hidden={true}
                        className="size-10 rounded-md border border-border bg-background object-contain p-1"
                    />
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground underline-offset-4 hover:underline">
                            {row.original.name}
                        </div>
                    </div>
                </Link>
            ),
            meta: { className: 'min-w-56' },
        },
    ];

    const {
        items: rows,
        error: bucketsError,
        isLoading: bucketsIsLoading,
    } = useStorageBuckets(storageRegistry?.id ?? '');
    const error =
        registriesError ??
        (!registriesIsLoading && !storageRegistry
            ? new Error(t('resources.storageNotFound', { name: storage }))
            : bucketsError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="hard-drive">
                    <div>
                        <HeroTitle>{t('resources.bucketsTitle')}</HeroTitle>
                        <HeroDescription>
                            {t('resources.bucketsDescription', { name: storageRegistry?.name || storage })}
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={bucketColumns}
                data={rows}
                error={error}
                isLoading={registriesIsLoading || bucketsIsLoading}
                pageSize={25}
            />
        </div>
    );
}
