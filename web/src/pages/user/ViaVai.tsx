import { useEffect, useState } from 'react';

import { Hero } from '@/components/viavai/Hero';
import { Table } from '@/components/viavai/Table';
import { apiFetch } from '@/lib/api';
import { type TableSchemaConfig } from '@/types/viavai/table.types';

type HeroElement = {
    type: string;
    title: string;
    subtitle?: string | null;
};

type ApiTableColumn = {
    key: string;
    label?: string;
    align?: 'left' | 'center' | 'right';
    cell: string | string[];
};

type ApiTableElement = {
    type: string;
    columns: ApiTableColumn[];
    data: Record<string, unknown>[];
};

function isHeroElement(element: unknown): element is HeroElement {
    if (!element || typeof element !== 'object') {
        return false;
    }

    const candidate = element as Record<string, unknown>;
    return (
        typeof candidate.type === 'string' &&
        candidate.type.toLowerCase() === 'hero' &&
        typeof candidate.title === 'string'
    );
}

function isTableElement(element: unknown): element is ApiTableElement {
    if (!element || typeof element !== 'object') {
        return false;
    }

    const candidate = element as Record<string, unknown>;
    return (
        typeof candidate.type === 'string' &&
        candidate.type.toLowerCase() === 'table' &&
        Array.isArray(candidate.columns) &&
        Array.isArray(candidate.data)
    );
}

function toTableSchema(element: ApiTableElement): TableSchemaConfig {
    return {
        title: 'Table',
        schema: {
            columns: element.columns.map((column) => ({
                key: column.key,
                label: column.label ?? column.key,
                align: column.align ?? 'left',
                cell: Array.isArray(column.cell) ? column.cell : [column.cell],
            })),
        },
    };
}

export default function ViaVai() {
    const [samplePageData, setSamplePageData] = useState<unknown[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadSamplePage = async () => {
            try {
                const data = await apiFetch<unknown>('/sample/page');
                if (!isMounted) return;

                if (Array.isArray(data)) {
                    setSamplePageData(data);
                } else {
                    setSamplePageData([]);
                    setError('Unexpected response format for /sample/page');
                }
            } catch (requestError) {
                if (!isMounted) return;
                setError('Failed to load /sample/page');
                console.error(requestError);
            }
        };

        loadSamplePage();

        return () => {
            isMounted = false;
        };
    }, []);

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="space-y-4">
            {samplePageData.map((element, index) => {
                if (isHeroElement(element)) {
                    return (
                        <Hero
                            key={`hero-${index}`}
                            title={element.title}
                            subtitle={element.subtitle ?? undefined}
                        />
                    );
                }

                if (isTableElement(element)) {
                    return (
                        <Table
                            key={`table-${index}`}
                            schema={toTableSchema(element)}
                            data={element.data}
                        />
                    );
                }

                return null;
            })}
        </div>
    );
}
