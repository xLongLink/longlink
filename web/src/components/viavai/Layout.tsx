import { Fragment, type ReactNode } from 'react';

import {
    Button,
    type ButtonElement,
    isButton,
} from '@/components/viavai/Button';
import {
    Columns,
    type ColumnsElement,
    isColumns,
} from '@/components/viavai/Columns';
import { Hero, type HeroElement, isHero } from '@/components/viavai/Hero';
import {
    Table,
    type TableElement,
    type TableSchemaConfig,
    isTable,
} from '@/components/viavai/Table';
import { Separator } from '@/components/ui/separator';
import { isObject } from '@/lib/utils';

export type LayoutElement = {
    type: 'layout';
    components: unknown[];
};

export type SeparatorElement = {
    type: 'separator';
    orientation?: 'horizontal' | 'vertical';
};

export type ViaVaiElement =
    | HeroElement
    | ButtonElement
    | TableElement
    | ColumnsElement
    | LayoutElement
    | SeparatorElement;

type ViaVaiLayoutProps = {
    elements: unknown[];
};

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

    if (isButton(element)) {
        return (
            <Button
                key={`button-${index}`}
                text={element.text}
                variant={element.variant ?? 'default'}
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
