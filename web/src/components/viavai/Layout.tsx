import { Fragment, type ReactNode } from 'react';

import { Columns } from '@/components/viavai/Columns';
import { Hero } from '@/components/viavai/Hero';
import { Table } from '@/components/viavai/Table';
import {
    type ColumnsElement,
    type HeroElement,
    type LayoutElement,
    type TableElement,
} from '@/types/viavai/layout.types';
import { type TableSchemaConfig } from '@/types/viavai/table.types';

type ViaVaiLayoutProps = {
    elements: unknown[];
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isHeroElement(element: unknown): element is HeroElement {
    if (!isObject(element)) {
        return false;
    }

    return element.type === 'hero' && typeof element.title === 'string';
}

function isTableElement(element: unknown): element is TableElement {
    if (!isObject(element)) {
        return false;
    }

    return (
        element.type === 'table' &&
        Array.isArray(element.columns) &&
        Array.isArray(element.data)
    );
}

function isColumnsElement(element: unknown): element is ColumnsElement {
    if (!isObject(element)) {
        return false;
    }

    return (
        element.type === 'columns' &&
        Array.isArray(element.widths) &&
        Array.isArray(element.columns)
    );
}

function isLayoutElement(element: unknown): element is LayoutElement {
    if (!isObject(element)) {
        return false;
    }

    return element.type === 'layout' && Array.isArray(element.components);
}

function toTableSchema(element: TableElement): TableSchemaConfig {
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

function renderElement(element: unknown, index: string): ReactNode {
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

    if (isColumnsElement(element)) {
        return (
            <Columns key={`columns-${index}`} widths={element.widths}>
                {element.columns.map((column, columnIndex) => {
                    const nestedElements = Array.isArray(column) ? column : [];

                    return (
                        <Fragment key={`columns-${index}-${columnIndex}`}>
                            {nestedElements.map((nestedElement, nestedIndex) =>
                                renderElement(
                                    nestedElement,
                                    `${index}-${columnIndex}-${nestedIndex}`
                                )
                            )}
                        </Fragment>
                    );
                })}
            </Columns>
        );
    }

    if (isLayoutElement(element)) {
        return (
            <ViaVaiLayout
                key={`layout-${index}`}
                elements={element.components}
            />
        );
    }

    return null;
}

export function ViaVaiLayout({ elements }: ViaVaiLayoutProps) {
    return (
        <div className="space-y-4">
            {elements.map((element, index) =>
                renderElement(element, `${index}`)
            )}
        </div>
    );
}

export default ViaVaiLayout;
