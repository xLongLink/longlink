import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Link, useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useStorageBuckets } from '@/hooks/use-storage-buckets';
import { useStorages } from '@/hooks/use-storages';
import type { ApiStorageBucket } from '@/lib/types';

/** Renders buckets for a storage backend. */
export default function StorageBuckets() {
    const { storage = '' } = useParams();

    const { items: registries, error: registriesError, isLoading: registriesIsLoading } = useStorages();

    const storageRegistry = registries.find((registry) => registry.slug === storage);

    const bucketColumns: Array<ColumnDef<ApiStorageBucket>> = [
        {
            accessorKey: 'name',
            header: 'Bucket',
            cell: ({ row }) => (
                <Link
                    to={`/admin/storage/${encodeURIComponent(storage)}/buckets/${encodeURIComponent(row.original.name)}`}
                    className="flex items-center gap-3"
                >
                    <img
                        src="/images/S3.webp"
                        alt="S3 object storage"
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
        (!registriesIsLoading && !storageRegistry ? new Error(`Storage "${storage}" not found`) : bucketsError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="hard-drive">
                    <div>
                        <HeroTitle>Buckets</HeroTitle>
                        <HeroDescription>
                            Buckets managed by storage backend "{storageRegistry?.name || storage}".
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={bucketColumns}
                data={rows}
                error={error}
                isLoading={registriesIsLoading || bucketsIsLoading}
            />
        </div>
    );
}
