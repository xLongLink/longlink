import { type TableAlign } from '@/types/viavai/table.types';

export type HeroElement = {
    type: 'hero';
    title: string;
    subtitle?: string | null;
};

export type ApiTableColumn = {
    key: string;
    label?: string;
    align?: TableAlign;
    cell: string | string[];
};

export type TableElement = {
    type: 'table';
    columns: ApiTableColumn[];
    data: Record<string, unknown>[];
};

export type ColumnsElement = {
    type: 'columns';
    widths: number[];
    columns: unknown[];
};

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
    | TableElement
    | ColumnsElement
    | LayoutElement
    | SeparatorElement;
