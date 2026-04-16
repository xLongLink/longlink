export type TableAlign = 'left' | 'center' | 'right';

export type ApiTableCell = {
    value: string;
    bold?: boolean;
    link?: string;
};

export type ApiTableColumn = {
    key: string;
    label?: string;
    align?: TableAlign;
    value?: string;
    detail?: string | ApiTableCell;
    content?: ApiTableCell;
};

export const textAlignClasses: Record<TableAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};
