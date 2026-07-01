import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useStorageObjects } from '@/hooks/use-storage-objects';
import { useStorages } from '@/hooks/use-storages';
import type { ApiStorageObject } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

const objectColumns: Array<ColumnDef<ApiStorageObject>> = [
    {
        accessorKey: 'key',
        header: 'Object',
        cell: ({ getValue }) => <div className="truncate font-medium text-foreground">{getValue<string>()}</div>,
        meta: { className: 'min-w-64' },
    },
    {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ getValue }) => formatBytes(getValue<number>()),
        meta: { className: 'w-32' },
    },
    {
        accessorKey: 'etag',
        header: 'ETag',
        cell: ({ getValue }) => {
            const etag = getValue<string | null>();

            return etag ? (
                <span className="font-mono text-xs">{etag}</span>
            ) : (
                <span className="text-muted-foreground">—</span>
            );
        },
        meta: { className: 'min-w-40' },
    },
    {
        accessorKey: 'last_modified',
        header: 'Modified',
        cell: ({ getValue }) => {
            const value = getValue<string | null>();

            return value ? new Date(value).toLocaleString() : <span className="text-muted-foreground">—</span>;
        },
        meta: { className: 'w-52' },
    },
];

/** Renders object metadata for one storage bucket. */
export default function StorageObjects() {
    const { storage = '', bucket = '' } = useParams();

    const { items: registries, error: registriesError, isLoading: registriesIsLoading } = useStorages();

    const storageRegistry = registries.find((registry) => registry.slug === storage);

    const {
        items: rows,
        error: objectsError,
        isLoading: objectsIsLoading,
    } = useStorageObjects(storageRegistry?.id ?? '', bucket);
    const error =
        registriesError ??
        (!registriesIsLoading && !storageRegistry ? new Error(`Storage "${storage}" not found`) : objectsError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="hard-drive">
                    <div>
                        <HeroTitle>Objects</HeroTitle>
                        <HeroDescription>
                            Objects in bucket <span className="font-medium text-foreground">{bucket}</span> on storage
                            backend "{storageRegistry?.name || storage}".
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={objectColumns}
                data={rows}
                error={error}
                isLoading={registriesIsLoading || objectsIsLoading}
            />
        </div>
    );
}
