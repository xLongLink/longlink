import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { type ColumnDef } from '@tanstack/react-table';
import { useParams } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { useStorageObjects, useStorages } from '@/data/storage';
import { useTranslation } from '@/lib/i18n';
import type { ApiStorageObject } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

/** Renders object metadata for one storage bucket. */
export default function StorageObjects() {
    const { t } = useTranslation();
    const { storage = '', bucket = '' } = useParams();
    const objectColumns: Array<ColumnDef<ApiStorageObject>> = [
        {
            accessorKey: 'key',
            header: t('columns.object'),
            cell: ({ getValue }) => <div className="truncate font-medium text-foreground">{getValue<string>()}</div>,
            meta: { className: 'min-w-64' },
        },
        {
            accessorKey: 'size',
            header: t('columns.size'),
            cell: ({ getValue }) => formatBytes(getValue<number>()),
            meta: { className: 'w-32' },
        },
        {
            accessorKey: 'etag',
            header: t('columns.etag'),
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
    ];

    const { items: registries, error: registriesError, isLoading: registriesIsLoading } = useStorages();

    const storageRegistry = registries.find((registry) => registry.slug === storage);

    const {
        items: rows,
        error: objectsError,
        isLoading: objectsIsLoading,
    } = useStorageObjects(storageRegistry?.id ?? '', bucket);
    const error =
        registriesError ??
        (!registriesIsLoading && !storageRegistry
            ? new Error(t('resources.storageNotFound', { name: storage }))
            : objectsError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="hard-drive">
                    <div>
                        <HeroTitle>{t('resources.objectsTitle')}</HeroTitle>
                        <HeroDescription>
                            {t('resources.objectsDescription', { bucket, name: storageRegistry?.name || storage })}
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={objectColumns}
                data={rows}
                error={error}
                isLoading={registriesIsLoading || objectsIsLoading}
                pageSize={25}
            />
        </div>
    );
}
