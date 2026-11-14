import type { ReactNode } from 'react';

export type ColumnWidth = { type: 'proportional'; value: number; minWidth?: number } | { type: 'pixel'; value: number };

export type TableColumn<T extends Record<string, unknown>> = {
    key: string;
    header?: ReactNode;
    width?: ColumnWidth;
    align?: 'start' | 'center' | 'end';
    renderCell?: (row: T) => ReactNode;
};

/** Shares available width proportionally, preserving the existing explicit-column readability floor. */
export function proportional(
    value = 1,
    options?: { minWidth?: number }
): Extract<ColumnWidth, { type: 'proportional' }> {
    return { type: 'proportional', value, minWidth: options?.minWidth ?? 120 };
}

/** Fixes a column's width in pixels. */
export function pixel(value: number): Extract<ColumnWidth, { type: 'pixel' }> {
    return { type: 'pixel', value };
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- View row cells are unknown at this rendering boundary.
export function renderTableValue(value: unknown): ReactNode {
    // Match plain-cell behavior without stringifying objects or treating HTML as markup.
    if (value instanceof Date) return value.toISOString();

    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Only primitive row values have a default text representation.
    if (value == null || !['string', 'number', 'boolean', 'bigint'].includes(typeof value)) return '';

    return String(value);
}

export function tableColumns<T extends Record<string, unknown>>(
    data: T[],
    columns?: TableColumn<T>[]
): TableColumn<T>[] {
    if (columns) return columns;

    if (!data[0]) return [];

    // Preserve content-sized automatic columns, sampling only the first five rows.
    return Object.keys(data[0]).map((key) => {
        const header = key.charAt(0).toUpperCase() + key.slice(1);
        let contentLength = header.length;
        let wordLength = header.length;

        for (const row of data.slice(0, 5)) {
            const value = row[key];

            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Only text-like values inform automatic column widths.
            if (value == null || !['string', 'number', 'boolean'].includes(typeof value)) continue;

            const text = String(value);
            contentLength = Math.max(contentLength, text.length);

            for (const word of text.split(/[ \t\n]/)) wordLength = Math.max(wordLength, word.length);
        }

        return {
            key,
            header,
            width: proportional(contentLength <= 6 ? 1 : contentLength <= 15 ? 2 : 3, {
                minWidth: Math.max(wordLength * 8, 60)
            })
        };
    });
}

export function tableWidths<T extends Record<string, unknown>>(columns: TableColumn<T>[]) {
    let proportions = 0;

    // Flexible columns share the remaining space according to their relative weights.
    for (const column of columns) {
        if (column.width?.type !== 'pixel') proportions += column.width?.value ?? 1;
    }

    let flexibleMinimum = 0;

    // Satisfy every flexible floor without changing relative proportions at narrow widths.
    for (const column of columns) {
        if (column.width?.type === 'pixel') continue;

        const weight = column.width?.value ?? 1;
        const floor = column.width?.minWidth ?? (column.width ? 120 : 60);
        const required = (floor * proportions) / weight;

        if (proportions > 0 && required > flexibleMinimum) flexibleMinimum = required;
    }

    return columns.map((column) => {
        if (column.width?.type === 'pixel') return column.width.value;

        const share = proportions > 0 ? (column.width?.value ?? 1) / proportions : 0;

        return flexibleMinimum * share;
    });
}
