import { Fragment, type ReactNode } from 'react';

import { Columns, isColumns } from '@/components/viavai/Columns';
import { Hero, isHero } from '@/components/viavai/Hero';
import { Table, isTable } from '@/components/viavai/Table';
import { Separator } from '@/components/ui/separator';
import {
    type LayoutElement,
    type SeparatorElement,
    type TableElement,
} from '@/types/viavai/layout.types';
import { type TableSchemaConfig } from '@/types/viavai/table.types';

type ViaVaiLayoutProps = {
    elements: unknown[];
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function isLayout(element: unknown): element is LayoutElement {
    if (!isObject(element)) {
        return false;
    }

    return element.type === 'layout' && Array.isArray(element.components);
}

export function isSeparator(element: unknown): element is SeparatorElement {
    if (!isObject(element)) {
        return false;
    }

    return element.type === 'separator';
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
    if (isHero(element)) {
        return (
            <Hero
                key={`hero-${index}`}
                title={element.title}
                subtitle={element.subtitle ?? undefined}
            />
        );
    }

    if (isTable(element)) {
        return (
            <Table
                key={`table-${index}`}
                schema={toTableSchema(element)}
                data={element.data}
            />
        );
    }

    if (isColumns(element)) {
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

    if (isSeparator(element)) {
        return (
            <Separator
                key={`separator-${index}`}
                orientation={element.orientation ?? 'horizontal'}
            />
        );
    }

    if (isLayout(element)) {
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
